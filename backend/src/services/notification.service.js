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
}

export default new NotificationService();
