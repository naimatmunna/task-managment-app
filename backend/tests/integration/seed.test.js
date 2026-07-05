import { seedDemo, destroyDemo } from '../../src/seeders/demo.seeder.js';
import Organization from '../../src/models/organization.model.js';
import Membership from '../../src/models/membership.model.js';
import Team from '../../src/models/team.model.js';
import Task from '../../src/models/task.model.js';

describe('Demo seeder', () => {
  it('creates and tears down a complete demo workspace', async () => {
    await seedDemo();

    const org = await Organization.findOne({ slug: 'acme-inc' });
    expect(org).toBeTruthy();
    expect(await Membership.countDocuments({ organizationId: org.id })).toBe(5);
    expect(await Team.countDocuments({ organizationId: org.id })).toBe(2);
    expect(await Task.countDocuments({ organizationId: org.id })).toBe(15);

    // Idempotent: a second run does not duplicate.
    await seedDemo();
    expect(await Organization.countDocuments({ slug: 'acme-inc' })).toBe(1);

    await destroyDemo();
    expect(await Organization.findOne({ slug: 'acme-inc' })).toBeNull();
    expect(await Task.countDocuments({ organizationId: org.id })).toBe(0);
  });
});
