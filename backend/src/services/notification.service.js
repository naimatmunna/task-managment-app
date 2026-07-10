import notificationRepository from '../repositories/notification.repository.js';
import userRepository from '../repositories/user.repository.js';
import emailService from './email.service.js';
import { NOTIFICATION_TYPE } from '../constants/notifications.js';

/**
 * Creates in-app notifications and mirrors the important ones to email.
 * Callers should treat failures here as non-fatal (see task.service).
 */
class NotificationService {
  list(orgId, userId) {
    return notificationRepository.listForUser(orgId, userId);
  }

  unreadCount(orgId, userId) {
    return notificationRepository.countUnread(orgId, userId);
  }

  markRead(orgId, userId, id) {
    return notificationRepository.markRead(orgId, userId, id);
  }

  markAllRead(orgId, userId) {
    return notificationRepository.markAllRead(orgId, userId);
  }

  /** Notify (in-app + email) the user a task was just assigned to. */
  async notifyTaskAssigned({ organizationId, task, assignerName }) {
    const userId = task.assigneeId;
    if (!userId) return null;

    const link = `/app/board?task=${task.id}`;
    const notification = await notificationRepository.create({
      organizationId,
      userId,
      type: NOTIFICATION_TYPE.TASK_ASSIGNED,
      title: 'New task assigned',
      body: `${assignerName || 'Someone'} assigned you “${task.title}”.`,
      link,
    });

    const assignee = await userRepository.findById(userId);
    if (assignee?.email) {
      await emailService.sendTaskAssignedEmail(assignee.email, {
        taskTitle: task.title,
        assignerName,
        link,
      });
      notification.emailedAt = new Date();
      await notification.save();
    }
    return notification;
  }

  /** Notify a task's assignee that it's due soon / overdue. `task.assigneeId` may be populated. */
  async notifyTaskDueSoon({ organizationId, task, now = new Date() }) {
    const userId = task.assigneeId?._id || task.assigneeId;
    if (!userId) return null;

    const overdue = task.dueDate && new Date(task.dueDate) < now;
    const link = `/app/board?task=${task.id}`;
    const notification = await notificationRepository.create({
      organizationId,
      userId,
      type: NOTIFICATION_TYPE.TASK_DUE_SOON,
      title: overdue ? 'Task overdue' : 'Task due soon',
      body: overdue ? `“${task.title}” is overdue.` : `“${task.title}” is due soon.`,
      link,
    });

    // Reuse the already-populated assignee (from the reminder scan) when present.
    const assignee = task.assigneeId?.email ? task.assigneeId : await userRepository.findById(userId);
    if (assignee?.email) {
      await emailService.sendTaskDueSoonEmail(assignee.email, {
        taskTitle: task.title,
        dueDate: task.dueDate,
        overdue,
        link,
      });
      notification.emailedAt = new Date();
      await notification.save();
    }
    return notification;
  }

  /** Notify a user they were @-mentioned in a task comment (in-app + email). */
  async notifyTaskMention({ organizationId, task, userId, actorName, message }) {
    if (!userId) return null;

    const link = `/app/board?task=${task.id}`;
    const notification = await notificationRepository.create({
      organizationId,
      userId,
      type: NOTIFICATION_TYPE.TASK_MENTION,
      title: 'You were mentioned',
      body: `${actorName || 'Someone'} mentioned you on “${task.title}”.`,
      link,
    });

    const user = await userRepository.findById(userId);
    if (user?.email) {
      await emailService.sendMentionEmail(user.email, {
        taskTitle: task.title,
        actorName,
        message,
        link,
      });
      notification.emailedAt = new Date();
      await notification.save();
    }
    return notification;
  }
}

export default new NotificationService();
