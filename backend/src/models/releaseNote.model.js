import mongoose from 'mongoose';

const { Schema } = mongoose;

/** A point-in-time snapshot of one task, frozen into a release note. */
const snapshotSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
    title: String,
    status: String,
    priority: String,
    assignee: { type: String, default: 'Unassigned' },
    team: { type: String, default: '' },
    labels: { type: [String], default: [] },
    completedAt: Date,
    dueDate: Date,
    createdAt: Date,
  },
  { _id: false },
);

/**
 * A release note groups the tasks completed in a date range into a shareable,
 * exportable document. The `tasks` array is a snapshot taken at generation time
 * (regenerate re-takes it) so the note stays stable as the board evolves.
 */
const releaseNoteSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    version: { type: String, trim: true, default: '', maxlength: 40 },
    details: { type: String, default: '', maxlength: 8000 },
    dateFrom: { type: Date, required: true },
    dateTo: { type: Date, required: true },
    // The explicit set of tasks the user selected for this release. Used to
    // re-take a *stable* snapshot on regenerate (legacy notes without this fall
    // back to re-gathering the whole date range).
    taskIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Task' }], default: [] },
    tasks: { type: [snapshotSchema], default: [] },
    summary: {
      total: { type: Number, default: 0 },
      byStatus: { type: Map, of: Number, default: {} },
    },
    createdById: { type: Schema.Types.ObjectId, ref: 'User' },
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

releaseNoteSchema.index({ organizationId: 1, createdAt: -1 });

const ReleaseNote = mongoose.model('ReleaseNote', releaseNoteSchema);
export default ReleaseNote;
