import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * A tenant. Every team, task, membership, notification and report is scoped to
 * exactly one Organization. The creating user becomes its `owner`.
 */
const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    settings: {
      timezone: { type: String, default: 'UTC' },
      // Days of week the org works, 0=Sun..6=Sat. Used by report date ranges.
      workWeek: { type: [Number], default: [1, 2, 3, 4, 5] },
    },
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

const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
