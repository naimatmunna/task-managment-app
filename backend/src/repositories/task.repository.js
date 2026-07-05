import BaseRepository from './base.repository.js';
import Task from '../models/task.model.js';

class TaskRepository extends BaseRepository {
  constructor() {
    super(Task);
  }

  /** A task by id, guaranteed within the given org (multi-tenant guard). */
  findByIdInOrg(id, organizationId) {
    return this.model.findOne({ _id: id, organizationId }).exec();
  }

  /** Non-paginated fetch for board view & reports (org is the hard boundary). */
  findAll(filter, { sort = { order: 1 }, populate } = {}) {
    let q = this.model.find(filter).sort(sort);
    if (populate) q = q.populate(populate);
    return q.exec();
  }

  /** Largest order value in a column, to append a new/dropped card at the end. */
  async maxOrder(organizationId, status) {
    const top = await this.model
      .findOne({ organizationId, status })
      .sort({ order: -1 })
      .select('order')
      .lean()
      .exec();
    return top?.order ?? 0;
  }
}

export default new TaskRepository();
