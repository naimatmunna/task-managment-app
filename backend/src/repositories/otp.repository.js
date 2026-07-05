import BaseRepository from './base.repository.js';
import Otp from '../models/otp.model.js';

class OtpRepository extends BaseRepository {
  constructor() {
    super(Otp);
  }

  /** Most recent un-consumed code for an email+purpose. */
  findActive(email, purpose) {
    return this.model
      .findOne({ email: email?.toLowerCase(), purpose, consumedAt: null })
      .sort({ createdAt: -1 })
      .exec();
  }

  /** Invalidate any outstanding codes for this email+purpose before issuing a new one. */
  consumeAll(email, purpose) {
    return this.model
      .updateMany(
        { email: email?.toLowerCase(), purpose, consumedAt: null },
        { $set: { consumedAt: new Date() } },
      )
      .exec();
  }
}

export default new OtpRepository();
