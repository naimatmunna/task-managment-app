import BaseRepository from './base.repository.js';
import User from '../models/user.model.js';

/**
 * User-specific data access. Extends BaseRepository with queries that must
 * explicitly select normally-hidden fields (password, token hashes).
 */
class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  findByEmail(email, { withSecret = false } = {}) {
    const q = this.model.findOne({ email: email?.toLowerCase() });
    if (withSecret) q.select('+password +refreshTokenHashes');
    return q.exec();
  }

  findByIdWithSecret(id) {
    return this.model.findById(id).select('+password +refreshTokenHashes').exec();
  }

  /**
   * Atomic refresh-token-hash mutations. These use MongoDB update operators
   * instead of read-modify-save() so concurrent requests for the same user
   * cannot lose updates or trip Mongoose's array version guard (VersionError).
   */

  /** Append a hash and cap the set to the newest `max` sessions. */
  async pushRefreshHash(id, hash, max) {
    await this.model
      .updateOne(
        { _id: id },
        { $push: { refreshTokenHashes: { $each: [hash], $slice: -max } } },
      )
      .exec();
  }

  /** Remove a specific hash. Returns true if it was present (and removed). */
  async pullRefreshHash(id, hash) {
    const res = await this.model
      .updateOne({ _id: id, refreshTokenHashes: hash }, { $pull: { refreshTokenHashes: hash } })
      .exec();
    return res.modifiedCount > 0;
  }

  /** Drop all sessions for a user. */
  async clearRefreshHashes(id) {
    await this.model.updateOne({ _id: id }, { $set: { refreshTokenHashes: [] } }).exec();
  }
}

export default new UserRepository();
