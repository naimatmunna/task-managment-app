import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, ROLE_VALUES } from '../constants/roles.js';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    roles: {
      type: [String],
      enum: ROLE_VALUES,
      default: [ROLES.USER],
    },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    // A requested-but-not-yet-verified new email. The live `email` keeps working
    // until the change is confirmed via OTP, so a typo can't lock the user out.
    pendingEmail: { type: String, lowercase: true, trim: true, default: null, select: false },
    avatar: { url: String, publicId: String },
    lastLoginAt: { type: Date },

    // Refresh-token rotation: store hashes of currently-valid refresh tokens.
    // Email verification and password reset are handled by the Otp model.
    refreshTokenHashes: { type: [String], default: [], select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.refreshTokenHashes;
        delete ret.pendingEmail;
        return ret;
      },
    },
  },
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
