import Task from '../models/task.model.js';
import notificationService from './notification.service.js';
import { TASK_STATUS } from '../constants/taskEnums.js';
import logger from '../utils/logger.js';

/** How far ahead of the due date a "due soon" reminder fires. */
const DUE_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Finds open, assigned tasks that are due within the next 24h (or overdue) and
 * haven't been reminded for their current due date, then notifies each assignee
 * once. `reminderSentFor` is stamped with the due date so re-runs are idempotent;
 * changing a task's due date re-arms it (see task.service update).
 */
class ReminderService {
  async scanDueTasks(now = new Date()) {
    const horizon = new Date(now.getTime() + DUE_SOON_WINDOW_MS);
    const tasks = await Task.find({
      status: { $ne: TASK_STATUS.DONE },
      assigneeId: { $ne: null },
      dueDate: { $ne: null, $lte: horizon },
      // Skip tasks already reminded for this exact due date.
      $expr: { $ne: ['$reminderSentFor', '$dueDate'] },
    })
      .populate({ path: 'assigneeId', select: 'name email' })
      .exec();

    let sent = 0;
    for (const task of tasks) {
      try {
        await notificationService.notifyTaskDueSoon({
          organizationId: task.organizationId,
          task,
          now,
        });
        task.reminderSentFor = task.dueDate;
        await task.save();
        sent += 1;
      } catch (err) {
        logger.warn(`Reminder for task ${task.id} failed: ${err.message}`);
      }
    }
    if (sent) logger.info(`Reminders: notified ${sent} task(s)`);
    return sent;
  }
}

export default new ReminderService();
