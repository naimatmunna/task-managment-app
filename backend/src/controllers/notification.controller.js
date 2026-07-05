import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/ApiResponse.js';
import notificationService from '../services/notification.service.js';

export const listNotifications = catchAsync(async (req, res) => {
  const [notifications, unread] = await Promise.all([
    notificationService.list(req.orgId, req.user.id),
    notificationService.unreadCount(req.orgId, req.user.id),
  ]);
  return ApiResponse.send(res, { data: { notifications, unread } });
});

export const markRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markRead(req.orgId, req.user.id, req.params.id);
  return ApiResponse.send(res, { data: { notification } });
});

export const markAllRead = catchAsync(async (req, res) => {
  await notificationService.markAllRead(req.orgId, req.user.id);
  return ApiResponse.send(res, { message: 'All notifications marked read' });
});
