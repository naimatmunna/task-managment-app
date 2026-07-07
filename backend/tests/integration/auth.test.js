import request from 'supertest';
import createApp from '../../src/app.js';

const app = createApp();
const base = '/api/v1';

const validSignup = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  password: 'Secret123!',
  organizationName: 'Acme Inc',
};

/** Sign up + verify OTP, returning the access token, cookie and memberships. */
const signupAndVerify = async (overrides = {}) => {
  const payload = { ...validSignup, ...overrides };
  const signup = await request(app).post(`${base}/auth/signup`).send(payload);
  const code = signup.body.data.devCode;
  const verify = await request(app)
    .post(`${base}/auth/verify-otp`)
    .send({ email: payload.email, code });
  return {
    token: verify.body.data.accessToken,
    cookie: verify.headers['set-cookie'],
    memberships: verify.body.data.memberships,
    signup,
    verify,
  };
};

describe('Auth flow (OTP)', () => {
  it('signs up: creates the account + org and returns a dev OTP', async () => {
    const res = await request(app).post(`${base}/auth/signup`).send(validSignup);
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe(validSignup.email);
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.organization.slug).toBe('acme-inc');
    expect(res.body.data.devCode).toMatch(/^\d{6}$/);
  });

  it('rejects duplicate email', async () => {
    await request(app).post(`${base}/auth/signup`).send(validSignup);
    const res = await request(app).post(`${base}/auth/signup`).send(validSignup);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_IN_USE');
  });

  it('rejects invalid signup payload', async () => {
    const res = await request(app).post(`${base}/auth/signup`).send({ email: 'bad' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('blocks login until the email is verified', async () => {
    await request(app).post(`${base}/auth/signup`).send(validSignup);
    const res = await request(app)
      .post(`${base}/auth/login`)
      .send({ email: validSignup.email, password: validSignup.password });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('verifies the OTP, logs in, and returns the owner membership', async () => {
    const { verify, memberships } = await signupAndVerify();
    expect(verify.status).toBe(200);
    expect(verify.body.data.accessToken).toBeDefined();
    expect(verify.headers['set-cookie'].join()).toMatch(/refresh_token/);
    expect(memberships).toHaveLength(1);
    expect(memberships[0].role).toBe('owner');
    expect(memberships[0].organization.name).toBe('Acme Inc');
  });

  it('rejects a wrong OTP code', async () => {
    await request(app).post(`${base}/auth/signup`).send(validSignup);
    const res = await request(app)
      .post(`${base}/auth/verify-otp`)
      .send({ email: validSignup.email, code: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OTP_INVALID');
  });

  it('logs in after verification', async () => {
    await signupAndVerify();
    const res = await request(app)
      .post(`${base}/auth/login`)
      .send({ email: validSignup.email, password: validSignup.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.memberships[0].role).toBe('owner');
  });

  it('rejects bad credentials generically', async () => {
    await signupAndVerify();
    const res = await request(app)
      .post(`${base}/auth/login`)
      .send({ email: validSignup.email, password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns the current user + memberships from /me', async () => {
    const { token } = await signupAndVerify();
    const res = await request(app).get(`${base}/auth/me`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validSignup.email);
    expect(res.body.data.memberships[0].organization.slug).toBe('acme-inc');
  });

  it('blocks /me without a token', async () => {
    const res = await request(app).get(`${base}/auth/me`);
    expect(res.status).toBe(401);
  });

  it('rotates refresh tokens', async () => {
    const { cookie } = await signupAndVerify();
    const res = await request(app).post(`${base}/auth/refresh`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('resend-otp responds without leaking account existence', async () => {
    const res = await request(app)
      .post(`${base}/auth/resend-otp`)
      .send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
  });

  it('lets a user edit their own profile', async () => {
    const { token } = await signupAndVerify();
    const res = await request(app)
      .patch(`${base}/auth/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ada Lovelace', avatarUrl: 'https://example.com/a.png' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Ada Lovelace');
    expect(res.body.data.user.avatar.url).toBe('https://example.com/a.png');

    const me = await request(app).get(`${base}/auth/me`).set('Authorization', `Bearer ${token}`);
    expect(me.body.data.user.name).toBe('Ada Lovelace');
  });
});

describe('Health', () => {
  it('reports healthy', async () => {
    const res = await request(app).get(`${base}/health`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });
});

describe('Multi-tenant isolation', () => {
  it('forbids a normal user from enumerating the global user list', async () => {
    const { token } = await signupAndVerify();
    const res = await request(app).get(`${base}/users`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
