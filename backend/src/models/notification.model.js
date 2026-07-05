import mongoose from 'mongoose';
import { NOTIFICATION_TYPE_VALUES } from '../constants/notifications.js';

const { Schema } = mongoose;

/** An in-app notification for a single user within an org. May also be emailed. */
const notificationSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPE_VALUES, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    link: { type: String, default: null }, // client-side path, e.g. /app/tasks?task=<id>
    read: { type: Boolean, default: false },
    emailedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

notificationSchema.index({ organizationId: 1, userId: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
