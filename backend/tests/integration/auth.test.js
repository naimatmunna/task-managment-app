import request from 'supertest';
import createApp from '../../src/app.js';

const app = createApp();
const base = '/api/v1';

const validUser = { name: 'Jane Doe', email: 'jane@example.com', password: 'Secret123!' };

describe('Auth flow', () => {
  it('registers a new user', async () => {
    const res = await request(app).post(`${base}/auth/register`).send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('rejects duplicate email', async () => {
    await request(app).post(`${base}/auth/register`).send(validUser);
    const res = await request(app).post(`${base}/auth/register`).send(validUser);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EMAIL_IN_USE');
  });

  it('rejects invalid registration payload', async () => {
    const res = await request(app).post(`${base}/auth/register`).send({ email: 'bad' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('logs in and returns an access token + refresh cookie', async () => {
    await request(app).post(`${base}/auth/register`).send(validUser);
    const res = await request(app).post(`${base}/auth/login`).send({
      email: validUser.email,
      password: validUser.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.headers['set-cookie'].join()).toMatch(/refresh_token/);
  });

  it('rejects bad credentials', async () => {
    await request(app).post(`${base}/auth/register`).send(validUser);
    const res = await request(app).post(`${base}/auth/login`).send({
      email: validUser.email,
      password: 'wrongpass',
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns the current user from /me with a valid token', async () => {
    await request(app).post(`${base}/auth/register`).send(validUser);
    const login = await request(app).post(`${base}/auth/login`).send({
      email: validUser.email,
      password: validUser.password,
    });
    const token = login.body.data.accessToken;
    const res = await request(app).get(`${base}/auth/me`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
  });

  it('blocks /me without a token', async () => {
    const res = await request(app).get(`${base}/auth/me`);
    expect(res.status).toBe(401);
  });

  it('rotates refresh tokens', async () => {
    await request(app).post(`${base}/auth/register`).send(validUser);
    const login = await request(app).post(`${base}/auth/login`).send({
      email: validUser.email,
      password: validUser.password,
    });
    const cookie = login.headers['set-cookie'];
    const res = await request(app).post(`${base}/auth/refresh`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });
});

describe('Health', () => {
  it('reports healthy', async () => {
    const res = await request(app).get(`${base}/health`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });
});

describe('RBAC', () => {
  it('forbids a normal user from creating users', async () => {
    await request(app).post(`${base}/auth/register`).send(validUser);
    const login = await request(app).post(`${base}/auth/login`).send({
      email: validUser.email,
      password: validUser.password,
    });
    const token = login.body.data.accessToken;
    const res = await request(app)
      .post(`${base}/users`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'X', email: 'x@example.com', password: 'Secret123!' });
    expect(res.status).toBe(403);
  });
});
