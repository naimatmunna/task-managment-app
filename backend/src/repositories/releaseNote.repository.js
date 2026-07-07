import BaseRepository from './base.repository.js';
import ReleaseNote from '../models/releaseNote.model.js';

class ReleaseNoteRepository extends BaseRepository {
  constructor() {
    super(ReleaseNote);
  }

  listByOrg(organizationId) {
    return this.model.find({ organizationId }).sort({ createdAt: -1 }).exec();
  }

  findByIdInOrg(id, organizationId) {
    return this.model.findOne({ _id: id, organizationId }).exec();
  }
}

export default new ReleaseNoteRepository();
