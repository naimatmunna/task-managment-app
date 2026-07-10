import mongoose from 'mongoose';
import {
  TASK_STATUS,
  TASK_STATUS_VALUES,
  TASK_PRIORITY,
  TASK_PRIORITY_VALUES,
} from '../constants/taskEnums.js';

const { Schema } = mongoose;

/** An immutable-ish activity entry appended to a task's timeline. */
const activitySchema = new Schema(
  {
    type: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    message: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

/** A single checklist item. Keeps its own `_id` so it can be toggled/removed. */
const subtaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    done: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

/** A file attached to a task. `publicId` lets the storage layer delete it later. */
const attachmentSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 300 },
    url: { type: String, required: true },
    publicId: { type: String, default: null },
    size: { type: Number, default: 0 },
    mime: { type: String, default: '' },
    uploadedById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    createdAt: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

/**
 * The core "todo". Always scoped to an organization; optionally to a team.
 * `order` is a float so cards can be re-sorted within a column without
 * rewriting every sibling (insert-between via averaging neighbours).
 */
const taskSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 5000 },
    status: { type: String, enum: TASK_STATUS_VALUES, default: TASK_STATUS.TODO, index: true },
    priority: { type: String, enum: TASK_PRIORITY_VALUES, default: TASK_PRIORITY.MEDIUM },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    createdById: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    labels: { type: [String], default: [] },
    order: { type: Number, default: 0 },
    subtasks: { type: [subtaskSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    activity: { type: [activitySchema], default: [] },
    // Marks the due date we last sent a reminder for, so the reminder job never
    // notifies twice for the same deadline (reset when the due date changes).
    reminderSentFor: { type: Date, default: null },
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

// Primary board query: all tasks in an org grouped by status, sorted by order.
taskSchema.index({ organizationId: 1, status: 1, order: 1 });
taskSchema.index({ organizationId: 1, assigneeId: 1 });
taskSchema.index({ organizationId: 1, dueDate: 1 });

const Task = mongoose.model('Task', taskSchema);
export default Task;
