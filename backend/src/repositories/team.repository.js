import BaseRepository from './base.repository.js';
import Team from '../models/team.model.js';

class TeamRepository extends BaseRepository {
  constructor() {
    super(Team);
  }

  /** A team by id, guaranteed within the given org (multi-tenant guard). */
  findByIdInOrg(id, organizationId) {
    return this.model.findOne({ _id: id, organizationId }).exec();
  }

  listByOrg(organizationId) {
    return this.model.find({ organizationId }).sort({ createdAt: -1 }).exec();
  }
}

export default new TeamRepository();
