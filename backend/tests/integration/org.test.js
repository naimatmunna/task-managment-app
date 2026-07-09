import request from 'supertest';
import createApp from '../../src/app.js';
import Membership from '../../src/models/membership.model.js';

const app = createApp();
const base = '/api/v1';

/** Sign up + verify, returning an access token and the owner's org id. */
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
  };
};

const auth = (req, token, orgId) => {
  req.set('Authorization', `Bearer ${token}`);
  if (orgId) req.set('x-org-id', orgId);
  return req;
};

describe('Organizations, members & invites', () => {
  it('returns the active organization for its owner', async () => {
    const { token, orgId } = await newOwner({ email: 'a@ex.com', org: 'Alpha' });
    const res = await auth(request(app).get(`${base}/orgs/current`), token, orgId);
    expect(res.status).toBe(200);
    expect(res.body.data.organization.name).toBe('Alpha');
    expect(res.body.data.memberCount).toBe(1);
  });

  it('invites a teammate, who accepts and becomes a member', async () => {
    const { token, orgId } = await newOwner({ email: 'owner@ex.com', org: 'Beta' });

    const invite = await auth(request(app).post(`${base}/orgs/members/invite`), token, orgId).send({
      email: 'teammate@ex.com',
    });
    expect(invite.status).toBe(201);
    const inviteToken = invite.body.data.devToken;
    expect(inviteToken).toBeTruthy();

    // Peek shows the flow needs a profile (no account yet).
    const peek = await request(app).get(`${base}/orgs/invite`).query({ token: inviteToken });
    expect(peek.body.data.email).toBe('teammate@ex.com');
    expect(peek.body.data.needsProfile).toBe(true);

    const accept = await request(app).post(`${base}/orgs/invite/accept`).send({
      token: inviteToken,
      name: 'Team Mate',
      password: 'Secret123!',
    });
    expect(accept.status).toBe(200);
    expect(accept.body.data.accessToken).toBeDefined();
    expect(accept.body.data.memberships[0].role).toBe('member');

    // Owner now sees two members.
    const members = await auth(request(app).get(`${base}/orgs/members`), token, orgId);
    expect(members.body.data.members).toHaveLength(2);
  });

  it('distinguishes an unknown token (invalid) from an expired one', async () => {
    const { token, orgId } = await newOwner({ email: 'sep@ex.com', org: 'Sep' });

    // A bogus token → invalid, not "expired".
    const bogus = await request(app).get(`${base}/orgs/invite`).query({ token: 'x'.repeat(64) });
    expect(bogus.status).toBe(400);
    expect(bogus.body.code).toBe('INVITE_INVALID');

    // A real invite whose expiry is in the past → expired, not "invalid".
    const invite = await auth(request(app).post(`${base}/orgs/members/invite`), token, orgId).send({
      email: 'late@ex.com',
    });
    const rawToken = invite.body.data.devToken;
    await Membership.updateOne(
      { invitedEmail: 'late@ex.com' },
      { $set: { inviteExpiresAt: new Date(Date.now() - 1000) } },
    );

    const peek = await request(app).get(`${base}/orgs/invite`).query({ token: rawToken });
    expect(peek.status).toBe(400);
    expect(peek.body.code).toBe('INVITE_EXPIRED');
  });

  it('reports whether the invite email was actually sent', async () => {
    const { token, orgId } = await newOwner({ email: 'mail@ex.com', org: 'Mailer' });
    const invite = await auth(request(app).post(`${base}/orgs/members/invite`), token, orgId).send({
      email: 'pending@ex.com',
    });
    // No SMTP configured in tests → the flag is present and false (not a crash).
    expect(invite.status).toBe(201);
    expect(invite.body.data.emailSent).toBe(false);
  });

  it('blocks a non-admin member from inviting', async () => {
    const { token, orgId } = await newOwner({ email: 'o2@ex.com', org: 'Gamma' });
    const invite = await auth(request(app).post(`${base}/orgs/members/invite`), token, orgId).send({
      email: 'newbie@ex.com',
    });
    const accept = await request(app).post(`${base}/orgs/invite/accept`).send({
      token: invite.body.data.devToken,
      name: 'Newbie',
      password: 'Secret123!',
    });
    const memberToken = accept.body.data.accessToken;

    const res = await auth(request(app).post(`${base}/orgs/members/invite`), memberToken, orgId).send({
      email: 'another@ex.com',
    });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INSUFFICIENT_ORG_ROLE');
  });

  it('prevents a user from acting on an organization they do not belong to', async () => {
    const alpha = await newOwner({ email: 'alpha@ex.com', org: 'AlphaCorp' });
    const beta = await newOwner({ email: 'beta@ex.com', org: 'BetaCorp' });

    // Beta's owner tries to read Alpha's org using Alpha's org id → denied.
    const res = await auth(request(app).get(`${base}/orgs/current`), beta.token, alpha.orgId);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ORG_ACCESS_DENIED');
  });

  it('promotes and removes a member', async () => {
    const { token, orgId } = await newOwner({ email: 'boss@ex.com', org: 'Delta' });
    const invite = await auth(request(app).post(`${base}/orgs/members/invite`), token, orgId).send({
      email: 'worker@ex.com',
    });
    const accept = await request(app).post(`${base}/orgs/invite/accept`).send({
      token: invite.body.data.devToken,
      name: 'Worker',
      password: 'Secret123!',
    });
    const membershipId = accept.body.data.memberships[0].id;

    const promote = await auth(
      request(app).patch(`${base}/orgs/members/${membershipId}/role`),
      token,
      orgId,
    ).send({ role: 'admin' });
    expect(promote.status).toBe(200);
    expect(promote.body.data.membership.role).toBe('admin');

    const remove = await auth(
      request(app).delete(`${base}/orgs/members/${membershipId}`),
      token,
      orgId,
    );
    expect(remove.status).toBe(200);

    const members = await auth(request(app).get(`${base}/orgs/members`), token, orgId);
    expect(members.body.data.members).toHaveLength(1);
  });
});
