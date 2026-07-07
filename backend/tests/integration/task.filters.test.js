import request from 'supertest';
import createApp from '../../src/app.js';

const app = createApp();
const base = '/api/v1';

const newOwner = async ({ email, org }) => {
  const signup = await request(app)
    .post(`${base}/auth/signup`)
    .send({ name: 'Owner', email, password: 'Secret123!', organizationName: org });
  const verify = await request(app)
    .post(`${base}/auth/verify-otp`)
    .send({ email, code: signup.body.data.devCode });
  return {
    token: verify.body.data.accessToken,
    orgId: verify.body.data.memberships[0].organization.id,
  };
};

const auth = (req, token, orgId) => {
  req.set('Authorization', `Bearer ${token}`);
  if (orgId) req.set('x-org-id', orgId);
  return req;
};

/** UTC midnight `offset` days from today — the same convention due dates are stored in. */
const dayUtc = (offset) => {
  const n = new Date();
  const d = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
};
const endOfDayIso = (offset) => `${dayUtc(offset).toISOString().slice(0, 10)}T23:59:59.999Z`;

const mkTask = (o, title, fields = {}) =>
  auth(request(app).post(`${base}/tasks`), o.token, o.orgId).send({ title, ...fields });

const titles = (res) => res.body.data.tasks.map((t) => t.title).sort();

/** A fixed spread of tasks around "today" for exercising the due-date filters. */
const seed = async (email, org) => {
  const o = await newOwner({ email, org });
  await mkTask(o, 'past-open', { dueDate: dayUtc(-1), status: 'todo' });
  await mkTask(o, 'past-inprog', { dueDate: dayUtc(-1), status: 'in_progress' });
  await mkTask(o, 'past-done', { dueDate: dayUtc(-1), status: 'done' });
  await mkTask(o, 'today-open', { dueDate: dayUtc(0), status: 'todo' });
  await mkTask(o, 'future-open', { dueDate: dayUtc(1), status: 'in_progress' });
  await mkTask(o, 'no-due', {});
  return o;
};

const get = (o, path) => auth(request(app).get(`${base}${path}`), o.token, o.orgId);

describe('Task due-date filters', () => {
  it('overdue excludes tasks due today, done tasks, and future/undated tasks', async () => {
    const o = await seed('due1@ex.com', 'DueOrg1');
    const res = await get(o, '/tasks?overdue=true');
    expect(titles(res)).toEqual(['past-inprog', 'past-open']);
  });

  it('overdue respects an explicit status filter instead of clobbering it', async () => {
    const o = await seed('due2@ex.com', 'DueOrg2');
    const res = await get(o, '/tasks?overdue=true&status=todo');
    expect(titles(res)).toEqual(['past-open']); // not past-inprog
  });

  it('custom range (dueAfter/dueBefore) is inclusive of the day bounds', async () => {
    const o = await seed('due3@ex.com', 'DueOrg3');
    const after = encodeURIComponent(dayUtc(0).toISOString());
    const before = encodeURIComponent(endOfDayIso(1));
    const res = await get(o, `/tasks?dueAfter=${after}&dueBefore=${before}`);
    expect(titles(res)).toEqual(['future-open', 'today-open']);
  });

  it('a single-day custom range returns exactly that day', async () => {
    const o = await seed('due4@ex.com', 'DueOrg4');
    const after = encodeURIComponent(dayUtc(0).toISOString());
    const before = encodeURIComponent(endOfDayIso(0));
    const res = await get(o, `/tasks?dueAfter=${after}&dueBefore=${before}`);
    expect(titles(res)).toEqual(['today-open']);
  });

  it('the board endpoint applies the same due filters as the list', async () => {
    const o = await seed('due5@ex.com', 'DueOrg5');
    const res = await get(o, '/tasks/board?overdue=true');
    expect(titles(res)).toEqual(['past-inprog', 'past-open']);
  });

  it('combines due filters with other filters (priority) correctly', async () => {
    const o = await newOwner({ email: 'due6@ex.com', org: 'DueOrg6' });
    await mkTask(o, 'urgent-late', { dueDate: dayUtc(-2), status: 'todo', priority: 'high' });
    await mkTask(o, 'calm-late', { dueDate: dayUtc(-2), status: 'todo', priority: 'low' });
    const res = await get(o, '/tasks?overdue=true&priority=high');
    expect(titles(res)).toEqual(['urgent-late']);
  });
});
