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

describe('Teams', () => {
  it('creates, lists, updates and deletes a team (admin)', async () => {
    const { token, orgId, userId } = await newOwner({ email: 'lead@ex.com', org: 'TeamCo' });

    const create = await auth(request(app).post(`${base}/teams`), token, orgId).send({
      name: 'Engineering',
      description: 'Builds things',
      color: '#10b981',
      memberIds: [userId],
      leadId: userId,
    });
    expect(create.status).toBe(201);
    const team = create.body.data.team;
    expect(team.name).toBe('Engineering');
    expect(team.memberIds).toContain(userId);
    expect(team.leadId).toBe(userId);

    const list = await auth(request(app).get(`${base}/teams`), token, orgId);
    expect(list.body.data.teams).toHaveLength(1);

    const update = await auth(request(app).patch(`${base}/teams/${team.id}`), token, orgId).send({
      name: 'Platform',
    });
    expect(update.body.data.team.name).toBe('Platform');

    const del = await auth(request(app).delete(`${base}/teams/${team.id}`), token, orgId);
    expect(del.status).toBe(200);
  });

  it('rejects a team lead who is not an org member', async () => {
    const { token, orgId } = await newOwner({ email: 'owner2@ex.com', org: 'TeamCo2' });
    const res = await auth(request(app).post(`${base}/teams`), token, orgId).send({
      name: 'Ghosts',
      leadId: '5f1a2b3c4d5e6f7a8b9c0d1e', // random valid ObjectId, not a member
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_LEAD');
  });

  it('forbids a member from creating a team', async () => {
    const owner = await newOwner({ email: 'owner3@ex.com', org: 'TeamCo3' });
    const invite = await auth(request(app).post(`${base}/orgs/members/invite`), owner.token, owner.orgId).send({
      email: 'plainmember@ex.com',
    });
    const accept = await request(app).post(`${base}/orgs/invite/accept`).send({
      token: invite.body.data.devToken,
      name: 'Plain Member',
      password: 'Secret123!',
    });
    const memberToken = accept.body.data.accessToken;

    const res = await auth(request(app).post(`${base}/teams`), memberToken, owner.orgId).send({
      name: 'Unauthorized',
    });
    expect(res.status).toBe(403);
  });

  it("does not leak another org's teams", async () => {
    const a = await newOwner({ email: 'a-org@ex.com', org: 'OrgA' });
    const b = await newOwner({ email: 'b-org@ex.com', org: 'OrgB' });
    await auth(request(app).post(`${base}/teams`), a.token, a.orgId).send({ name: 'A-Team' });

    const bList = await auth(request(app).get(`${base}/teams`), b.token, b.orgId);
    expect(bList.body.data.teams).toHaveLength(0);
  });
});
