import otpRepository from '../repositories/otp.repository.js';
import emailService from './email.service.js';
import ApiError from '../utils/ApiError.js';
import config from '../config/index.js';
import { generateNumericCode, hashToken } from '../utils/crypto.js';

/**
 * Issues and verifies one-time email codes. A code is hashed at rest,
 * time-boxed, single-use, and attempt-limited. Issuing a new code invalidates
 * any outstanding codes for the same (email, purpose).
 */
class OtpService {
  /**
   * Create + email a fresh OTP. Returns the raw code so the caller can surface
   * it in non-production responses (dev convenience when SMTP is unconfigured).
   */
  async issue(email, purpose) {
    const normalized = email.toLowerCase();
    await otpRepository.consumeAll(normalized, purpose);

    const code = generateNumericCode(config.otp.length);
    await otpRepository.create({
      email: normalized,
      codeHash: hashToken(code),
      purpose,
      expiresAt: new Date(Date.now() + config.otp.expiresMin * 60 * 1000),
    });

    await emailService.sendOtpEmail(normalized, code, purpose);
    return code;
  }

  /**
   * Validate a submitted code. Consumes it on success. Throws a generic
   * ApiError on any failure (expired / wrong / exhausted) with a stable code,
   * incrementing the attempt counter and burning the OTP when the limit is hit.
   */
  async verify(email, purpose, code) {
    const normalized = email.toLowerCase();
    const otp = await otpRepository.findActive(normalized, purpose);

    const invalid = () => ApiError.badRequest('Invalid or expired code', { code: 'OTP_INVALID' });

    if (!otp) throw invalid();
    if (otp.expiresAt.getTime() < Date.now()) {
      otp.consumedAt = new Date();
      await otp.save();
      throw invalid();
    }
    if (otp.attempts >= config.otp.maxAttempts) {
      otp.consumedAt = new Date();
      await otp.save();
      throw ApiError.badRequest('Too many attempts. Request a new code.', { code: 'OTP_EXHAUSTED' });
    }

    if (otp.codeHash !== hashToken(code)) {
      otp.attempts += 1;
      if (otp.attempts >= config.otp.maxAttempts) otp.consumedAt = new Date();
      await otp.save();
      throw invalid();
    }

    otp.consumedAt = new Date();
    await otp.save();
    return true;
  }
}

export default new OtpService();
