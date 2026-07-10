// Must be first: sets ENABLE_SOCKET before config.js reads the environment.
import './enableSocket.js';
import http from 'node:http';
import request from 'supertest';
import { io as connectClient } from 'socket.io-client';
import createApp from '../../src/app.js';
import { initSocket } from '../../src/loaders/socket.js';
import taskService from '../../src/services/task.service.js';

/** Realtime layer: presence broadcast + live task events. */
const base = '/api/v1';

const app = createApp();
let server;
let port;

/** Resolve on the next occurrence of `event`, or reject after `ms`. */
const once = (socket, event, ms = 4000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

const clientFor = (token) =>
  connectClient(`http://localhost:${port}`, {
    transports: ['websocket'],
    auth: { token },
    forceNew: true,
  });

/** Sign up + verify OTP → { token, userId, orgId }. */
const newOwner = async (email, org) => {
  const signup = await request(app)
    .post(`${base}/auth/signup`)
    .send({ name: 'Owner', email, password: 'Secret123!', organizationName: org });
  const verify = await request(app)
    .post(`${base}/auth/verify-otp`)
    .send({ email, code: signup.body.data.devCode });
  return {
    token: verify.body.data.accessToken,
    userId: verify.body.data.user.id,
    orgId: verify.body.data.memberships[0].organization.id,
  };
};

beforeAll(async () => {
  server = http.createServer(app);
  await initSocket(server);
  await new Promise((resolve) => {
    server.listen(0, () => {
      port = server.address().port;
      resolve();
    });
  });
});

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

describe('Realtime (Socket.io)', () => {
  it('broadcasts presence when members come online', async () => {
    const owner = await newOwner('rt-owner@ex.com', 'Realtime');

    const clientA = clientFor(owner.token);
    const first = await once(clientA, 'presence:update');
    expect(first.orgId).toBe(owner.orgId);
    expect(first.online).toContain(owner.userId);

    // A second member of the same org coming online notifies the first.
    const invite = await request(app)
      .post(`${base}/orgs/members/invite`)
      .set('Authorization', `Bearer ${owner.token}`)
      .set('x-org-id', owner.orgId)
      .send({ email: 'rt-mate@ex.com' });
    const accept = await request(app).post(`${base}/orgs/invite/accept`).send({
      token: invite.body.data.devToken,
      name: 'Mate',
      password: 'Secret123!',
    });
    const mate = { token: accept.body.data.accessToken, userId: accept.body.data.user.id };

    const ownerSeesMate = once(clientA, 'presence:update');
    const clientB = clientFor(mate.token);
    const update = await ownerSeesMate;
    expect(update.online).toEqual(expect.arrayContaining([owner.userId, mate.userId]));

    clientA.disconnect();
    clientB.disconnect();
  });

  it('broadcasts a task status change to online members in the org', async () => {
    const owner = await newOwner('rt2-owner@ex.com', 'Realtime2');
    const client = clientFor(owner.token);
    await once(client, 'presence:update'); // ensure joined the org room

    // Create a task via the service (emits task:created to the org room).
    const createdEvent = once(client, 'task:created');
    const task = await taskService.create(owner.orgId, owner.userId, { title: 'Ship it' });
    const created = await createdEvent;
    expect(created.task.id).toBe(task.id);

    // Move it to a new status (emits task:updated).
    const updatedEvent = once(client, 'task:updated');
    await taskService.update(owner.orgId, owner.userId, task.id, { status: 'in_progress' });
    const updated = await updatedEvent;
    expect(updated.task.id).toBe(task.id);
    expect(updated.task.status).toBe('in_progress');

    client.disconnect();
  });
});
