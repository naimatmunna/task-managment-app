import BaseRepository from './base.repository.js';
import Organization from '../models/organization.model.js';
import { slugify } from '../utils/slugify.js';

class OrganizationRepository extends BaseRepository {
  constructor() {
    super(Organization);
  }

  findBySlug(slug) {
    return this.model.findOne({ slug: slug?.toLowerCase() }).exec();
  }

  /** Produce a slug that is unique across all orgs, appending -2, -3, … on collision. */
  async generateUniqueSlug(name) {
    const base = slugify(name) || 'org';
    let candidate = base;
    let n = 1;
    while (await this.model.exists({ slug: candidate })) {
      n += 1;
      candidate = `${base}-${n}`;
    }
    return candidate;
  }
}

export default new OrganizationRepository();
