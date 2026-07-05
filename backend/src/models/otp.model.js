import mongoose from 'mongoose';
import { OTP_PURPOSE_VALUES } from '../constants/otp.js';

const { Schema } = mongoose;

/**
 * One-time verification code. The raw 6-digit code is emailed; only its hash is
 * stored. A code is single-use (`consumedAt`), time-boxed (`expiresAt`) and
 * attempt-limited (`attempts`). A TTL index reaps expired docs automatically.
 */
const otpSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: OTP_PURPOSE_VALUES, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

otpSchema.index({ email: 1, purpose: 1 });
// TTL: Mongo removes the doc once expiresAt passes (best-effort, ~60s granularity).
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Otp = mongoose.model('Otp', otpSchema);
export default Otp;
