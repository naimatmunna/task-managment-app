import taskRepository from '../repositories/task.repository.js';
import teamRepository from '../repositories/team.repository.js';
import membershipRepository from '../repositories/membership.repository.js';
import userRepository from '../repositories/user.repository.js';
import notificationService from './notification.service.js';
import { getStorage } from '../storage/index.js';
import { emitToOrg } from '../loaders/socket.js';
import ApiError from '../utils/ApiError.js';
import { TASK_STATUS, TASK_ACTIVITY, TASK_STATUS_VALUES, TASK_PRIORITY_VALUES } from '../constants/taskEnums.js';

const ASSIGNEE_FIELDS = 'name avatar email';
const TEAM_FIELDS = 'name color';

/** UTC midnight of the current day — the exclusive upper bound for "overdue". */
const startOfTodayUtc = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
};

/**
 * Task use-cases, always scoped to req.orgId. Handles Kanban ordering (float
 * `order` so a card can be inserted between two neighbours without renumbering),
 * an append-only activity log, and assignment/status side effects.
 */
class TaskService {
  populate() {
    return [
      { path: 'assigneeId', select: ASSIGNEE_FIELDS },
      { path: 'teamId', select: TEAM_FIELDS },
    ];
  }

  /** Ensure an assignee is an active member and a team belongs to this org. */
  async validateRefs(orgId, { assigneeId, teamId }) {
    if (assigneeId) {
      const active = await membershipRepository.activeUserIds(orgId);
      if (!active.has(String(assigneeId))) {
        throw ApiError.badRequest('Assignee must be a member of this organization', {
          code: 'INVALID_ASSIGNEE',
        });
      }
    }
    if (teamId) {
      const team = await teamRepository.findByIdInOrg(teamId, orgId);
      if (!team) throw ApiError.badRequest('Team not found in this organization', { code: 'INVALID_TEAM' });
    }
  }

  /** Translate query params into a safe, org-scoped Mongo filter. */
  buildFilter(orgId, q = {}) {
    const filter = { organizationId: orgId };
    if (q.status && TASK_STATUS_VALUES.includes(q.status)) filter.status = q.status;
    if (q.priority && TASK_PRIORITY_VALUES.includes(q.priority)) filter.priority = q.priority;
    if (q.assigneeId) filter.assigneeId = q.assigneeId === 'none' ? null : q.assigneeId;
    if (q.teamId) filter.teamId = q.teamId === 'none' ? null : q.teamId;
    if (q.label) filter.labels = q.label;
    if (q.search) {
      const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: rx }, { description: rx }];
    }
    if (q.overdue === 'true') {
      // "Overdue" = due on an earlier calendar day and not done. Compare against
      // the start of today (UTC), matching how due dates are stored (UTC midnight)
      // so a task due *today* is not counted as overdue.
      filter.dueDate = { $lt: startOfTodayUtc() };
      // Don't clobber an explicit status filter (e.g. Status=Todo + Overdue);
      // only default to "not done" when the caller hasn't chosen a status.
      if (!filter.status) filter.status = { $ne: TASK_STATUS.DONE };
    } else {
      const due = {};
      if (q.dueAfter) due.$gte = new Date(q.dueAfter);
      if (q.dueBefore) due.$lte = new Date(q.dueBefore);
      if (Object.keys(due).length) filter.dueDate = due;
    }
    // Completion window — used by the release-note candidate picker (a release
    // groups tasks by when they were *completed*).
    const completed = {};
    if (q.completedAfter) completed.$gte = new Date(q.completedAfter);
    if (q.completedBefore) completed.$lte = new Date(q.completedBefore);
    if (Object.keys(completed).length) filter.completedAt = completed;
    return filter;
  }

  /** Ids of every task matching a filter (org-scoped) — powers "select all matching". */
  async listIds(orgId, q = {}) {
    const filter = this.buildFilter(orgId, q);
    const rows = await taskRepository.model.find(filter).select('_id').lean().exec();
    return rows.map((r) => String(r._id));
  }

  /** Paginated, sortable list (List view). */
  async list(orgId, q = {}) {
    const filter = this.buildFilter(orgId, q);
    const page = Math.max(1, parseInt(q.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 25));
    const sort = this.parseSort(q.sort);

    const { items, meta } = await taskRepository.paginate({
      filter,
      sort,
      skip: (page - 1) * limit,
      limit,
      page,
      populate: this.populate(),
    });
    return { items, meta };
  }

  parseSort(sortStr) {
    if (!sortStr) return { updatedAt: -1 };
    const sort = {};
    sortStr.split(',').forEach((f) => {
      const s = f.trim();
      if (!s) return;
      if (s.startsWith('-')) sort[s.slice(1)] = -1;
      else sort[s] = 1;
    });
    return Object.keys(sort).length ? sort : { updatedAt: -1 };
  }

  /** All matching tasks for the board (no pagination), ordered for columns. */
  async board(orgId, q = {}) {
    const filter = this.buildFilter(orgId, q);
    return taskRepository.findAll(filter, {
      sort: { status: 1, order: 1 },
      populate: this.populate(),
    });
  }

  /** All matching tasks (no pagination), newest first — used by exports. */
  async collect(orgId, q = {}) {
    const filter = this.buildFilter(orgId, q);
    return taskRepository.findAll(filter, {
      sort: { createdAt: -1 },
      populate: this.populate(),
    });
  }

  async get(orgId, id) {
    const task = await taskRepository.model
      .findOne({ _id: id, organizationId: orgId })
      .populate(this.populate())
      .exec();
    if (!task) throw ApiError.notFound('Task not found');
    return task;
  }

  async create(orgId, actorId, payload) {
    await this.validateRefs(orgId, payload);
    const status = payload.status || TASK_STATUS.TODO;
    const maxOrder = await taskRepository.maxOrder(orgId, status);

    const task = await taskRepository.create({
      organizationId: orgId,
      title: payload.title,
      description: payload.description || '',
      status,
      priority: payload.priority || 'medium',
      assigneeId: payload.assigneeId || null,
      teamId: payload.teamId || null,
      dueDate: payload.dueDate || null,
      labels: payload.labels || [],
      order: maxOrder + 1,
      createdById: actorId,
      completedAt: status === TASK_STATUS.DONE ? new Date() : null,
      activity: [{ type: TASK_ACTIVITY.CREATED, actorId, message: 'created this task' }],
    });

    if (task.assigneeId && String(task.assigneeId) !== String(actorId)) {
      await this.notifyAssignment(orgId, task, actorId);
    }
    const created = await this.get(orgId, task.id);
    emitToOrg(orgId, 'task:created', { task: created });
    return created;
  }

  async update(orgId, actorId, id, patch) {
    const task = await taskRepository.findByIdInOrg(id, orgId);
    if (!task) throw ApiError.notFound('Task not found');

    await this.validateRefs(orgId, patch);
    const activity = [];
    let assignedTo = null;

    if (patch.title !== undefined) task.title = patch.title;
    if (patch.description !== undefined) task.description = patch.description;
    if (patch.priority !== undefined) task.priority = patch.priority;
    if (patch.teamId !== undefined) task.teamId = patch.teamId || null;
    if (patch.dueDate !== undefined) {
      const nextDue = patch.dueDate || null;
      // A changed deadline re-arms the reminder so the new date is announced.
      if (String(nextDue) !== String(task.dueDate || '')) task.reminderSentFor = null;
      task.dueDate = nextDue;
    }
    if (patch.labels !== undefined) task.labels = patch.labels;
    if (patch.order !== undefined) task.order = patch.order;

    if (patch.status !== undefined && patch.status !== task.status) {
      task.status = patch.status;
      task.completedAt = patch.status === TASK_STATUS.DONE ? new Date() : null;
      activity.push({ type: TASK_ACTIVITY.STATUS_CHANGED, actorId, message: `moved to ${patch.status.replace('_', ' ')}` });
    }

    if (patch.assigneeId !== undefined) {
      const next = patch.assigneeId || null;
      if (String(next) !== String(task.assigneeId || '')) {
        task.assigneeId = next;
        if (next) {
          assignedTo = next;
          activity.push({ type: TASK_ACTIVITY.ASSIGNED, actorId, message: 'assigned this task' });
        } else {
          activity.push({ type: TASK_ACTIVITY.UNASSIGNED, actorId, message: 'unassigned this task' });
        }
      }
    }

    if (activity.length) task.activity.push(...activity);
    await task.save();

    if (assignedTo && String(assignedTo) !== String(actorId)) {
      await this.notifyAssignment(orgId, task, actorId);
    }
    const updated = await this.get(orgId, task.id);
    emitToOrg(orgId, 'task:updated', { task: updated });
    return updated;
  }

  /** Drag-drop: move a card to a column at a given float order. */
  reorder(orgId, actorId, id, { status, order }) {
    return this.update(orgId, actorId, id, { status, order });
  }

  async remove(orgId, id) {
    const task = await taskRepository.findByIdInOrg(id, orgId);
    if (!task) throw ApiError.notFound('Task not found');
    await taskRepository.deleteById(id);
    emitToOrg(orgId, 'task:deleted', { id });
    return { id };
  }

  async addComment(orgId, actorId, id, message, mentions = []) {
    const task = await taskRepository.findByIdInOrg(id, orgId);
    if (!task) throw ApiError.notFound('Task not found');
    task.activity.push({ type: TASK_ACTIVITY.COMMENTED, actorId, message });
    await task.save();
    const updated = await this.reloadAndEmit(orgId, task.id);
    if (mentions?.length) await this.notifyMentions(orgId, updated, actorId, mentions, message);
    return updated;
  }

  /** Re-fetch the populated task, broadcast the change, and return it. */
  async reloadAndEmit(orgId, id) {
    const updated = await this.get(orgId, id);
    emitToOrg(orgId, 'task:updated', { task: updated });
    return updated;
  }

  // ---- Checklist / subtasks ------------------------------------------------

  async addSubtask(orgId, id, title) {
    const task = await taskRepository.findByIdInOrg(id, orgId);
    if (!task) throw ApiError.notFound('Task not found');
    task.subtasks.push({ title });
    await task.save();
    return this.reloadAndEmit(orgId, task.id);
  }

  async updateSubtask(orgId, id, subId, patch) {
    const task = await taskRepository.findByIdInOrg(id, orgId);
    if (!task) throw ApiError.notFound('Task not found');
    const sub = task.subtasks.id(subId);
    if (!sub) throw ApiError.notFound('Subtask not found');
    if (patch.title !== undefined) sub.title = patch.title;
    if (patch.done !== undefined) sub.done = patch.done;
    await task.save();
    return this.reloadAndEmit(orgId, task.id);
  }

  async removeSubtask(orgId, id, subId) {
    const task = await taskRepository.findByIdInOrg(id, orgId);
    if (!task) throw ApiError.notFound('Task not found');
    if (!task.subtasks.id(subId)) throw ApiError.notFound('Subtask not found');
    task.subtasks.pull(subId);
    await task.save();
    return this.reloadAndEmit(orgId, task.id);
  }

  // ---- Attachments ---------------------------------------------------------

  async addAttachment(orgId, actorId, id, file) {
    const task = await taskRepository.findByIdInOrg(id, orgId);
    if (!task) throw ApiError.notFound('Task not found');
    const { url, publicId } = await getStorage().upload(file.buffer, {
      filename: file.originalname,
      folder: `tasks/${orgId}`,
    });
    task.attachments.push({
      name: file.originalname,
      url,
      publicId,
      size: file.size,
      mime: file.mimetype,
      uploadedById: actorId,
    });
    await task.save();
    return this.reloadAndEmit(orgId, task.id);
  }

  async removeAttachment(orgId, id, attId) {
    const task = await taskRepository.findByIdInOrg(id, orgId);
    if (!task) throw ApiError.notFound('Task not found');
    const att = task.attachments.id(attId);
    if (!att) throw ApiError.notFound('Attachment not found');
    if (att.publicId) {
      try {
        await getStorage().remove(att.publicId);
      } catch {
        /* a missing/failed storage delete must not block removing the record */
      }
    }
    task.attachments.pull(attId);
    await task.save();
    return this.reloadAndEmit(orgId, task.id);
  }

  /** Notify each still-active, non-self mentioned user (in-app + email). Best-effort. */
  async notifyMentions(orgId, task, actorId, mentions, message) {
    try {
      const active = await membershipRepository.activeUserIds(orgId);
      const unique = [...new Set(mentions.map(String))].filter(
        (uid) => uid !== String(actorId) && active.has(uid),
      );
      if (!unique.length) return;
      const actor = await userRepository.findById(actorId);
      await Promise.all(
        unique.map((userId) =>
          notificationService.notifyTaskMention({
            organizationId: orgId,
            task,
            userId,
            actorName: actor?.name,
            message,
          }),
        ),
      );
    } catch {
      /* mention notifications are best-effort */
    }
  }

  /** In-app + email notification to the newly-assigned user. Never blocks the request. */
  async notifyAssignment(orgId, task, actorId) {
    try {
      const actor = await userRepository.findById(actorId);
      await notificationService.notifyTaskAssigned({
        organizationId: orgId,
        task,
        assignerName: actor?.name,
      });
    } catch {
      /* notification failures must not fail the task mutation */
    }
  }
}

export default new TaskService();
