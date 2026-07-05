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
}

export default new UserRepository();
