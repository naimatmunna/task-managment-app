import BaseRepository from './base.repository.js';
import Notification from '../models/notification.model.js';

class NotificationRepository extends BaseRepository {
  constructor() {
    super(Notification);
  }

  listForUser(organizationId, userId, { limit = 30 } = {}) {
    return this.model
      .find({ organizationId, userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  countUnread(organizationId, userId) {
    return this.model.countDocuments({ organizationId, userId, read: false });
  }

  markRead(organizationId, userId, id) {
    return this.model
      .findOneAndUpdate({ _id: id, organizationId, userId }, { $set: { read: true } }, { new: true })
      .exec();
  }

  markAllRead(organizationId, userId) {
    return this.model
      .updateMany({ organizationId, userId, read: false }, { $set: { read: true } })
      .exec();
  }
}

export default new NotificationRepository();
