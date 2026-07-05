import mongoose from 'mongoose';
import { ORG_ROLES, ORG_ROLE_VALUES, MEMBERSHIP_STATUS, MEMBERSHIP_STATUS_VALUES } from '../constants/orgRoles.js';

const { Schema } = mongoose;

/**
 * Join table between User and Organization carrying the user's org-scoped role
 * and status. An `invited` membership may have no userId yet (the invitee has
 * not accepted); it is matched by `invitedEmail` + hashed `inviteToken`.
 */
const membershipSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    role: { type: String, enum: ORG_ROLE_VALUES, default: ORG_ROLES.MEMBER },
    status: { type: String, enum: MEMBERSHIP_STATUS_VALUES, default: MEMBERSHIP_STATUS.ACTIVE },

    invitedEmail: { type: String, lowercase: true, trim: true, default: null },
    invitedById: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // sha256 of the raw invite token (raw value is emailed, never stored).
    inviteToken: { type: String, default: null, select: false },
    inviteExpiresAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.inviteToken;
        return ret;
      },
    },
  },
);

// One membership per (org, user). Partial so multiple invited rows (userId null) are allowed.
membershipSchema.index(
  { organizationId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } },
);
// Prevent duplicate pending invites to the same email in one org.
membershipSchema.index(
  { organizationId: 1, invitedEmail: 1 },
  { unique: true, partialFilterExpression: { invitedEmail: { $type: 'string' } } },
);

const Membership = mongoose.model('Membership', membershipSchema);
export default Membership;
