import request from 'supertest';
import createApp from '../../src/app.js';

const app = createApp();
const base = '/api/v1';

const newOwner = async ({ email, org }) => {
  const signup = await request(app).post(`${base}/auth/signup`).send({ name: 'Owner', email, password: 'Secret123!', organizationName: org });
  const verify = await request(app).post(`${base}/auth/verify-otp`).send({ email, code: signup.body.data.devCode });
  return { token: verify.body.data.accessToken, orgId: verify.body.data.memberships[0].organization.id };
};
const auth = (req, token, orgId) => {
  req.set('Authorization', `Bearer ${token}`);
  if (orgId) req.set('x-org-id', orgId);
  return req;
};
const makeTask = async (o, title, { done = false } = {}) => {
  const t = await auth(request(app).post(`${base}/tasks`), o.token, o.orgId).send({ title });
  const id = t.body.data.task.id;
  if (done) await auth(request(app).patch(`${base}/tasks/${id}`), o.token, o.orgId).send({ status: 'done' });
  return id;
};
const range = () => ({
  from: new Date(Date.now() - 864e5).toISOString(),
  to: new Date(Date.now() + 864e5).toISOString(),
});
const createRelease = (o, body) =>
  auth(request(app).post(`${base}/release-notes`), o.token, o.orgId).send({ ...range(), ...body });

describe('Release notes — explicit task selection', () => {
  it('adds only the selected tasks, not every completed task', async () => {
    const o = await newOwner({ email: 'sel1@ex.com', org: 'Sel1' });
    const a = await makeTask(o, 'Selected A', { done: true });
    const b = await makeTask(o, 'Selected B', { done: true });
    await makeTask(o, 'Not selected C', { done: true });

    const res = await createRelease(o, { taskIds: [a, b] });
    expect(res.status).toBe(201);
    const note = res.body.data.releaseNote;
    expect(note.tasks).toHaveLength(2);
    expect(note.tasks.map((t) => t.title).sort()).toEqual(['Selected A', 'Selected B']);
    expect(res.body.data.result).toEqual({ requested: 2, added: 2, skipped: 0 });
  });

  it('dedupes repeated task ids', async () => {
    const o = await newOwner({ email: 'sel2@ex.com', org: 'Sel2' });
    const a = await makeTask(o, 'Only once', { done: true });
    const res = await createRelease(o, { taskIds: [a, a, a] });
    expect(res.body.data.releaseNote.tasks).toHaveLength(1);
    expect(res.body.data.result.requested).toBe(1);
  });

  it('skips foreign, non-existent, and not-completed tasks (reports them)', async () => {
    const o = await newOwner({ email: 'sel3@ex.com', org: 'Sel3' });
    const other = await newOwner({ email: 'sel3b@ex.com', org: 'Sel3B' });
    const valid = await makeTask(o, 'Valid completed', { done: true });
    const notDone = await makeTask(o, 'Open task', { done: false }); // not completed → skipped
    const foreign = await makeTask(other, 'Another org task', { done: true }); // wrong org → skipped
    const bogus = '5f1a2b3c4d5e6f7a8b9c0d1e';

    const res = await createRelease(o, { taskIds: [valid, notDone, foreign, bogus] });
    expect(res.status).toBe(201);
    expect(res.body.data.releaseNote.tasks).toHaveLength(1);
    expect(res.body.data.result).toEqual({ requested: 4, added: 1, skipped: 3 });
    expect(res.body.message).toMatch(/could not be added/i);
  });

  it('rejects an empty selection', async () => {
    const o = await newOwner({ email: 'sel4@ex.com', org: 'Sel4' });
    const res = await createRelease(o, { taskIds: [] });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_TASKS');
  });

  it('rejects when every selected task is invalid', async () => {
    const o = await newOwner({ email: 'sel5@ex.com', org: 'Sel5' });
    const res = await createRelease(o, { taskIds: ['5f1a2b3c4d5e6f7a8b9c0d1e'] });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_VALID_TASKS');
  });

  it('regenerate re-snapshots the SAME selected set (not the whole range)', async () => {
    const o = await newOwner({ email: 'sel6@ex.com', org: 'Sel6' });
    const a = await makeTask(o, 'Kept A', { done: true });
    const b = await makeTask(o, 'Kept B', { done: true });
    const created = await createRelease(o, { taskIds: [a, b] });
    const id = created.body.data.releaseNote.id;

    // Completing a new task must NOT leak into this selection-based note.
    await makeTask(o, 'New completed after', { done: true });
    const regen = await auth(request(app).post(`${base}/release-notes/${id}/regenerate`), o.token, o.orgId);
    expect(regen.body.data.releaseNote.tasks).toHaveLength(2);
    expect(regen.body.data.releaseNote.tasks.map((t) => t.title).sort()).toEqual(['Kept A', 'Kept B']);
  });

  it('GET /tasks/ids returns only ids matching the filter (org-scoped)', async () => {
    const o = await newOwner({ email: 'sel7@ex.com', org: 'Sel7' });
    const a = await makeTask(o, 'Done one', { done: true });
    const b = await makeTask(o, 'Done two', { done: true });
    await makeTask(o, 'Still open', { done: false });

    const res = await auth(request(app).get(`${base}/tasks/ids?status=done`), o.token, o.orgId);
    expect(res.status).toBe(200);
    expect(res.body.data.ids.sort()).toEqual([a, b].sort());
    expect(res.body.meta.total).toBe(2);
  });

  it('completed-range filter on the task list scopes to the completion window', async () => {
    const o = await newOwner({ email: 'sel8@ex.com', org: 'Sel8' });
    await makeTask(o, 'Completed now', { done: true });
    const after = new Date(Date.now() - 864e5).toISOString();
    const before = new Date(Date.now() + 864e5).toISOString();
    const res = await auth(
      request(app).get(`${base}/tasks?completedAfter=${encodeURIComponent(after)}&completedBefore=${encodeURIComponent(before)}`),
      o.token,
      o.orgId,
    );
    expect(res.body.data.tasks).toHaveLength(1);
    expect(res.body.data.tasks[0].title).toBe('Completed now');
  });
});
