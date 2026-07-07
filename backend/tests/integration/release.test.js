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
const addMember = async (owner, email) => {
  const invite = await auth(request(app).post(`${base}/orgs/members/invite`), owner.token, owner.orgId).send({ email });
  const accept = await request(app).post(`${base}/orgs/invite/accept`).send({ token: invite.body.data.devToken, name: 'Mate', password: 'Secret123!' });
  return accept.body.data.accessToken;
};
const completeTask = async (o, title) => {
  const t = await auth(request(app).post(`${base}/tasks`), o.token, o.orgId).send({ title });
  await auth(request(app).patch(`${base}/tasks/${t.body.data.task.id}`), o.token, o.orgId).send({ status: 'done' });
};
const range = () => ({
  from: new Date(Date.now() - 864e5).toISOString(),
  to: new Date(Date.now() + 864e5).toISOString(),
});

describe('Release notes', () => {
  it('generates a note snapshotting tasks completed in the range', async () => {
    const o = await newOwner({ email: 'rel@ex.com', org: 'RelCo' });
    await completeTask(o, 'Shipped feature A');
    await completeTask(o, 'Shipped feature B');
    await auth(request(app).post(`${base}/tasks`), o.token, o.orgId).send({ title: 'Still in progress' });

    const res = await auth(request(app).post(`${base}/release-notes`), o.token, o.orgId).send({ ...range(), version: 'v1.0.0', details: 'First release.' });
    expect(res.status).toBe(201);
    const note = res.body.data.releaseNote;
    expect(note.tasks).toHaveLength(2); // only the two completed tasks
    expect(note.version).toBe('v1.0.0');
    expect(note.title).toMatch(/^Release —/);
    expect(note.summary.total).toBe(2);
  });

  it('lists, updates and regenerates', async () => {
    const o = await newOwner({ email: 'rel2@ex.com', org: 'RelCo2' });
    await completeTask(o, 'Task one');
    const created = await auth(request(app).post(`${base}/release-notes`), o.token, o.orgId).send(range());
    const id = created.body.data.releaseNote.id;

    const list = await auth(request(app).get(`${base}/release-notes`), o.token, o.orgId);
    expect(list.body.data.releaseNotes).toHaveLength(1);

    const upd = await auth(request(app).patch(`${base}/release-notes/${id}`), o.token, o.orgId).send({ title: 'Launch v1', details: 'Notes here' });
    expect(upd.body.data.releaseNote.title).toBe('Launch v1');

    // Complete another task, then regenerate → snapshot grows.
    await completeTask(o, 'Task two');
    const regen = await auth(request(app).post(`${base}/release-notes/${id}/regenerate`), o.token, o.orgId);
    expect(regen.body.data.releaseNote.tasks).toHaveLength(2);
  });

  it('exports PDF and Word', async () => {
    const o = await newOwner({ email: 'rel3@ex.com', org: 'RelCo3' });
    await completeTask(o, 'Documented task');
    const created = await auth(request(app).post(`${base}/release-notes`), o.token, o.orgId).send({ ...range(), details: 'Release overview.' });
    const id = created.body.data.releaseNote.id;

    const bin = (req) => req.buffer(true).parse((r, cb) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });

    const pdf = await bin(auth(request(app).get(`${base}/release-notes/${id}/export?format=pdf`), o.token, o.orgId));
    expect(pdf.status).toBe(200);
    expect(pdf.headers['content-type']).toMatch(/application\/pdf/);
    expect(pdf.body.slice(0, 5).toString()).toBe('%PDF-');

    const docx = await bin(auth(request(app).get(`${base}/release-notes/${id}/export?format=docx`), o.token, o.orgId));
    expect(docx.status).toBe(200);
    expect(docx.headers['content-type']).toMatch(/wordprocessingml/);
    expect(docx.body.slice(0, 2).toString('latin1')).toBe('PK');
  });

  it('restricts managing to admins but lets members view', async () => {
    const o = await newOwner({ email: 'rel4@ex.com', org: 'RelCo4' });
    await completeTask(o, 'Owned task');
    await auth(request(app).post(`${base}/release-notes`), o.token, o.orgId).send(range());
    const memberToken = await addMember(o, 'member4@ex.com');

    const forbidden = await auth(request(app).post(`${base}/release-notes`), memberToken, o.orgId).send(range());
    expect(forbidden.status).toBe(403);

    const list = await auth(request(app).get(`${base}/release-notes`), memberToken, o.orgId);
    expect(list.status).toBe(200);
    expect(list.body.data.releaseNotes).toHaveLength(1);
  });
});
