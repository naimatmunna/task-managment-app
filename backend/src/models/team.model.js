import mongoose from 'mongoose';

const { Schema } = mongoose;

/** A group of members inside an org. Tasks may belong to a team (or be unassigned to one). */
const teamSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    color: { type: String, default: '#6366f1' }, // indigo-500 default
    memberIds: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
    leadId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
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

teamSchema.index({ organizationId: 1, name: 1 });

const Team = mongoose.model('Team', teamSchema);
export default Team;
