import User from '../models/user.model.js';
import Organization from '../models/organization.model.js';
import Membership from '../models/membership.model.js';
import Team from '../models/team.model.js';
import Task from '../models/task.model.js';
import logger from '../utils/logger.js';
import { ORG_ROLES, MEMBERSHIP_STATUS } from '../constants/orgRoles.js';
import { TASK_STATUS, TASK_PRIORITY } from '../constants/taskEnums.js';

const ORG_SLUG = 'acme-inc';
const PASSWORD = 'Password123!';
const DAY = 24 * 60 * 60 * 1000;

const PEOPLE = [
  { key: 'sarah', name: 'Sarah Chen', email: 'owner@propvia.app', role: ORG_ROLES.OWNER },
  { key: 'marcus', name: 'Marcus Lee', email: 'admin@propvia.app', role: ORG_ROLES.ADMIN },
  { key: 'priya', name: 'Priya Patel', email: 'priya@propvia.app', role: ORG_ROLES.MEMBER },
  { key: 'diego', name: 'Diego Alvarez', email: 'diego@propvia.app', role: ORG_ROLES.MEMBER },
  { key: 'emma', name: 'Emma Wilson', email: 'emma@propvia.app', role: ORG_ROLES.MEMBER },
];

const S = TASK_STATUS;
const P = TASK_PRIORITY;

// Task blueprints: [title, status, priority, assigneeKey, teamKey, dueInDays|null, labels]
const TASKS = [
  ['Design the onboarding flow', S.IN_PROGRESS, P.HIGH, 'priya', 'design', 3, ['ux', 'onboarding']],
  ['Set up CI/CD pipeline', S.DONE, P.MEDIUM, 'marcus', 'eng', -5, ['devops']],
  ['Fix login redirect bug', S.IN_REVIEW, P.URGENT, 'diego', 'eng', 1, ['bug']],
  ['Write API documentation', S.TODO, P.LOW, 'marcus', 'eng', 10, ['docs']],
  ['Refactor task board component', S.IN_PROGRESS, P.MEDIUM, 'diego', 'eng', 4, ['tech-debt']],
  ['Create marketing landing page', S.BACKLOG, P.MEDIUM, 'emma', 'design', null, ['marketing']],
  ['Add dark mode to reports', S.TODO, P.LOW, 'diego', 'eng', 7, ['ux']],
  ['User research interviews', S.DONE, P.HIGH, 'priya', 'design', -2, ['research']],
  ['Optimize database indexes', S.BACKLOG, P.HIGH, 'marcus', 'eng', null, ['performance']],
  ['Draft Q3 roadmap', S.TODO, P.MEDIUM, 'sarah', null, 5, ['planning']],
  ['Prepare investor deck', S.IN_PROGRESS, P.URGENT, 'sarah', null, 2, ['exec']],
  ['Accessibility audit', S.BACKLOG, P.MEDIUM, 'emma', 'design', null, ['a11y']],
  ['Migrate to new email provider', S.DONE, P.LOW, 'marcus', 'eng', -8, ['infra']],
  ['Design system tokens', S.IN_REVIEW, P.MEDIUM, 'priya', 'design', 6, ['design-system']],
  ['Set up error monitoring', S.TODO, P.HIGH, 'diego', 'eng', 3, ['observability']],
];

export const seedDemo = async () => {
  if (await Organization.exists({ slug: ORG_SLUG })) {
    logger.info(`Demo org "${ORG_SLUG}" already exists — skipping. Run seed:destroy first to reseed.`);
    return;
  }

  // Users
  const users = {};
  for (const person of PEOPLE) {
    // create() runs the password-hash hook.
    users[person.key] = await User.create({
      name: person.name,
      email: person.email,
      password: PASSWORD,
      isEmailVerified: true,
    });
  }

  // Organization owned by Sarah
  const org = await Organization.create({
    name: 'Acme Inc',
    slug: ORG_SLUG,
    ownerId: users.sarah.id,
    settings: { timezone: 'America/New_York' },
  });

  // Memberships
  await Membership.insertMany(
    PEOPLE.map((p) => ({
      organizationId: org.id,
      userId: users[p.key].id,
      role: p.role,
      status: MEMBERSHIP_STATUS.ACTIVE,
    })),
  );

  // Teams
  const engineering = await Team.create({
    organizationId: org.id,
    name: 'Engineering',
    description: 'Builds and ships the product.',
    color: '#6366f1',
    memberIds: [users.marcus.id, users.diego.id, users.sarah.id],
    leadId: users.marcus.id,
  });
  const design = await Team.create({
    organizationId: org.id,
    name: 'Design',
    description: 'Owns product design and research.',
    color: '#ec4899',
    memberIds: [users.priya.id, users.emma.id],
    leadId: users.priya.id,
  });
  const teamByKey = { eng: engineering.id, design: design.id };

  // Tasks — track order per status column.
  const orderByStatus = {};
  const now = Date.now();
  const docs = TASKS.map(([title, status, priority, assigneeKey, teamKey, dueInDays, labels]) => {
    orderByStatus[status] = (orderByStatus[status] || 0) + 1;
    return {
      organizationId: org.id,
      title,
      status,
      priority,
      assigneeId: users[assigneeKey].id,
      teamId: teamKey ? teamByKey[teamKey] : null,
      createdById: users.sarah.id,
      dueDate: dueInDays == null ? null : new Date(now + dueInDays * DAY),
      completedAt: status === TASK_STATUS.DONE ? new Date(now - 1 * DAY) : null,
      labels,
      order: orderByStatus[status],
      activity: [{ type: 'created', actorId: users.sarah.id, message: 'created this task' }],
    };
  });
  await Task.insertMany(docs);

  logger.info(`Seeded demo org "Acme Inc" with ${PEOPLE.length} users, 2 teams and ${TASKS.length} tasks.`);
  logger.info(`Sign in with owner@propvia.app / ${PASSWORD} (all demo accounts share this password).`);
};

export const destroyDemo = async () => {
  const org = await Organization.findOne({ slug: ORG_SLUG });
  if (!org) {
    logger.info('No demo org to remove.');
    return;
  }
  await Promise.all([
    Task.deleteMany({ organizationId: org.id }),
    Team.deleteMany({ organizationId: org.id }),
    Membership.deleteMany({ organizationId: org.id }),
    User.deleteMany({ email: { $in: PEOPLE.map((p) => p.email) } }),
  ]);
  await Organization.deleteOne({ _id: org.id });
  logger.info('Removed demo org and its users, teams and tasks.');
};
