import request from 'supertest';
import createApp from '../../src/app.js';
import reminderService from '../../src/services/reminder.service.js';

const app = createApp();
const base = '/api/v1';

const newOwner = async ({ email, org }) => {
  const signup = await request(app).post(`${base}/auth/signup`).send({
    name: 'Owner',
    email,
    password: 'Secret123!',
    organizationName: org,
  });
  const verify = await request(app)
    .post(`${base}/auth/verify-otp`)
    .send({ email, code: signup.body.data.devCode });
  return {
    token: verify.body.data.accessToken,
    orgId: verify.body.data.memberships[0].organization.id,
    userId: verify.body.data.user.id,
  };
};

const auth = (req, token, orgId) => {
  req.set('Authorization', `Bearer ${token}`);
  if (orgId) req.set('x-org-id', orgId);
  return req;
};

const addMember = async (owner, email) => {
  const invite = await auth(request(app).post(`${base}/orgs/members/invite`), owner.token, owner.orgId).send({ email });
  const accept = await request(app).post(`${base}/orgs/invite/accept`).send({
    token: invite.body.data.devToken,
    name: 'Mate',
    password: 'Secret123!',
  });
  return { token: accept.body.data.accessToken, userId: accept.body.data.user.id };
};

const createTask = async (o, body) => {
  const res = await auth(request(app).post(`${base}/tasks`), o.token, o.orgId).send(body);
  return res.body.data.task;
};

describe('Phase 1 features', () => {
  it('adds, toggles and removes checklist subtasks', async () => {
    const o = await newOwner({ email: 'p1a@ex.com', org: 'P1A' });
    const task = await createTask(o, { title: 'With checklist' });

    const add = await auth(request(app).post(`${base}/tasks/${task.id}/subtasks`), o.token, o.orgId).send({ title: 'Step one' });
    expect(add.status).toBe(201);
    expect(add.body.data.task.subtasks).toHaveLength(1);
    const sub = add.body.data.task.subtasks[0];
    expect(sub.id).toBeTruthy();
    expect(sub.done).toBe(false);

    const toggled = await auth(request(app).patch(`${base}/tasks/${task.id}/subtasks/${sub.id}`), o.token, o.orgId).send({ done: true });
    expect(toggled.body.data.task.subtasks[0].done).toBe(true);

    const removed = await auth(request(app).delete(`${base}/tasks/${task.id}/subtasks/${sub.id}`), o.token, o.orgId);
    expect(removed.status).toBe(200);
    expect(removed.body.data.task.subtasks).toHaveLength(0);
  });

  it('uploads and deletes an attachment', async () => {
    const o = await newOwner({ email: 'p1b@ex.com', org: 'P1B' });
    const task = await createTask(o, { title: 'With files' });

    const up = await auth(request(app).post(`${base}/tasks/${task.id}/attachments`), o.token, o.orgId)
      .attach('file', Buffer.from('hello world'), 'notes.txt');
    expect(up.status).toBe(201);
    expect(up.body.data.task.attachments).toHaveLength(1);
    const att = up.body.data.task.attachments[0];
    expect(att.name).toBe('notes.txt');
    expect(att.url).toMatch(/^\/uploads\//);

    const del = await auth(request(app).delete(`${base}/tasks/${task.id}/attachments/${att.id}`), o.token, o.orgId);
    expect(del.status).toBe(200);
    expect(del.body.data.task.attachments).toHaveLength(0);
  });

  it('notifies @mentioned members on a comment', async () => {
    const o = await newOwner({ email: 'p1c@ex.com', org: 'P1C' });
    const mate = await addMember(o, 'p1cmate@ex.com');
    const task = await createTask(o, { title: 'Discuss' });

    const res = await auth(request(app).post(`${base}/tasks/${task.id}/comment`), o.token, o.orgId).send({
      message: 'Hey @Mate can you look?',
      mentions: [mate.userId],
    });
    expect(res.status).toBe(200);

    const notifs = await auth(request(app).get(`${base}/notifications`), mate.token, o.orgId);
    const mention = notifs.body.data.notifications.find((n) => n.type === 'task_mention');
    expect(mention).toBeTruthy();
  });

  it('reminder scan notifies the assignee of an overdue task exactly once', async () => {
    const o = await newOwner({ email: 'p1d@ex.com', org: 'P1D' });
    const mate = await addMember(o, 'p1dmate@ex.com');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await createTask(o, { title: 'Overdue thing', assigneeId: mate.userId, dueDate: yesterday });

    const first = await reminderService.scanDueTasks();
    expect(first).toBe(1);
    const second = await reminderService.scanDueTasks();
    expect(second).toBe(0); // idempotent — already reminded for this due date

    const notifs = await auth(request(app).get(`${base}/notifications`), mate.token, o.orgId);
    const due = notifs.body.data.notifications.filter((n) => n.type === 'task_due_soon');
    expect(due).toHaveLength(1);
  });
});
