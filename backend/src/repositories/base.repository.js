import { buildPaginationMeta } from '../utils/pagination.js';

/**
 * Generic data-access layer over a Mongoose model.
 * Services depend on repositories, never on Mongoose directly — this keeps
 * persistence swappable and query logic in one place (DRY, low coupling).
 */
export default class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  create(payload) {
    return this.model.create(payload);
  }

  findById(id, { projection, populate } = {}) {
    let q = this.model.findById(id, projection);
    if (populate) q = q.populate(populate);
    return q.exec();
  }

  findOne(filter = {}, { projection, populate } = {}) {
    let q = this.model.findOne(filter, projection);
    if (populate) q = q.populate(populate);
    return q.exec();
  }

  exists(filter) {
    return this.model.exists(filter);
  }

  /** Paginated list using normalized options from parseQueryOptions(). */
  async paginate({ filter = {}, sort, skip = 0, limit = 20, page = 1, projection, populate }) {
    let query = this.model.find(filter, projection).sort(sort).skip(skip).limit(limit);
    if (populate) query = query.populate(populate);

    const [items, total] = await Promise.all([
      query.exec(),
      this.model.countDocuments(filter),
    ]);

    return { items, meta: buildPaginationMeta({ page, limit, total }) };
  }

  updateById(id, update, options = { new: true, runValidators: true }) {
    return this.model.findByIdAndUpdate(id, update, options).exec();
  }

  deleteById(id) {
    return this.model.findByIdAndDelete(id).exec();
  }

  count(filter = {}) {
    return this.model.countDocuments(filter);
  }
}
