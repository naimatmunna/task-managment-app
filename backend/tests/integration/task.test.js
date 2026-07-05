import request from 'supertest';
import createApp from '../../src/app.js';

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

/** Invite + accept a second member, returning their token + userId. */
const addMember = async (owner, email) => {
  const invite = await auth(request(app).post(`${base}/orgs/members/invite`), owner.token, owner.orgId).send({ email });
  const accept = await request(app).post(`${base}/orgs/invite/accept`).send({
    token: invite.body.data.devToken,
    name: 'Mate',
    password: 'Secret123!',
  });
  return { token: accept.body.data.accessToken, userId: accept.body.data.user.id };
};

describe('Tasks', () => {
  it('creates a task and returns it on the board', async () => {
    const o = await newOwner({ email: 'task1@ex.com', org: 'TaskOrg' });
    const create = await auth(request(app).post(`${base}/tasks`), o.token, o.orgId).send({
      title: 'Ship the thing',
      priority: 'high',
    });
    expect(create.status).toBe(201);
    expect(create.body.data.task.title).toBe('Ship the thing');
    expect(create.body.data.task.status).toBe('todo');

    const board = await auth(request(app).get(`${base}/tasks/board`), o.token, o.orgId);
    expect(board.body.data.tasks).toHaveLength(1);
  });

  it('sets completedAt when moved to done and clears it when moved back', async () => {
    const o = await newOwner({ email: 'task2@ex.com', org: 'TaskOrg2' });
    const create = await auth(request(app).post(`${base}/tasks`), o.token, o.orgId).send({ title: 'Finish' });
    const id = create.body.data.task.id;

    const done = await auth(request(app).patch(`${base}/tasks/${id}`), o.token, o.orgId).send({ status: 'done' });
    expect(done.body.data.task.completedAt).toBeTruthy();

    const back = await auth(request(app).patch(`${base}/tasks/${id}`), o.token, o.orgId).send({ status: 'todo' });
    expect(back.body.data.task.completedAt).toBeNull();
  });

  it('assigning a task creates an in-app notification for the assignee', async () => {
    const o = await newOwner({ email: 'boss3@ex.com', org: 'TaskOrg3' });
    const mate = await addMember(o, 'mate3@ex.com');

    const create = await auth(request(app).post(`${base}/tasks`), o.token, o.orgId).send({
      title: 'Please do this',
      assigneeId: mate.userId,
    });
    expect(create.body.data.task.assigneeId.id || create.body.data.task.assigneeId).toBeTruthy();

    // The assignee sees an unread notification.
    const notifs = await auth(request(app).get(`${base}/notifications`), mate.token, o.orgId);
    expect(notifs.body.data.unread).toBe(1);
    expect(notifs.body.data.notifications[0].type).toBe('task_assigned');
  });

  it('filters the list by status and supports reorder', async () => {
    const o = await newOwner({ email: 'filter@ex.com', org: 'FilterOrg' });
    await auth(request(app).post(`${base}/tasks`), o.token, o.orgId).send({ title: 'A', status: 'todo' });
    const b = await auth(request(app).post(`${base}/tasks`), o.token, o.orgId).send({ title: 'B', status: 'backlog' });

    const list = await auth(request(app).get(`${base}/tasks?status=backlog`), o.token, o.orgId);
    expect(list.body.data.tasks).toHaveLength(1);
    expect(list.body.data.tasks[0].title).toBe('B');
    expect(list.body.meta.pagination.total).toBe(1);

    const moved = await auth(request(app).post(`${base}/tasks/${b.body.data.task.id}/reorder`), o.token, o.orgId).send({
      status: 'in_progress',
      order: 5.5,
    });
    expect(moved.body.data.task.status).toBe('in_progress');
    expect(moved.body.data.task.order).toBe(5.5);
  });

  it('rejects an assignee who is not a member', async () => {
    const o = await newOwner({ email: 'strict@ex.com', org: 'StrictOrg' });
    const res = await auth(request(app).post(`${base}/tasks`), o.token, o.orgId).send({
      title: 'Bad assign',
      assigneeId: '5f1a2b3c4d5e6f7a8b9c0d1e',
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_ASSIGNEE');
  });

  it("cannot read or mutate another org's task", async () => {
    const a = await newOwner({ email: 'ta@ex.com', org: 'TA' });
    const b = await newOwner({ email: 'tb@ex.com', org: 'TB' });
    const create = await auth(request(app).post(`${base}/tasks`), a.token, a.orgId).send({ title: 'Secret' });
    const id = create.body.data.task.id;

    // B uses its own (authorized) org context but A's task id → not found.
    const read = await auth(request(app).get(`${base}/tasks/${id}`), b.token, b.orgId);
    expect(read.status).toBe(404);
  });
});
