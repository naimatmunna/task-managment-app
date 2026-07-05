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
  };
};
const auth = (req, token, orgId) => {
  req.set('Authorization', `Bearer ${token}`).set('x-org-id', orgId);
  return req;
};

describe('Reports', () => {
  it('aggregates task metrics into a structured report', async () => {
    const o = await newOwner({ email: 'rep@ex.com', org: 'ReportCo' });
    const mk = (body) => auth(request(app).post(`${base}/tasks`), o.token, o.orgId).send(body);
    const a = await mk({ title: 'Task A' });
    await mk({ title: 'Task B' });
    // Complete one.
    await auth(request(app).patch(`${base}/tasks/${a.body.data.task.id}`), o.token, o.orgId).send({ status: 'done' });

    const res = await auth(request(app).get(`${base}/reports?range=monthly&scope=org`), o.token, o.orgId);
    expect(res.status).toBe(200);
    const report = res.body.data.report;
    expect(report.summary.total).toBe(2);
    expect(report.summary.completed).toBe(1);
    expect(report.summary.completionRate).toBe(50);
    expect(report.byStatus).toHaveLength(5);
    expect(report.workloadByAssignee.length).toBeGreaterThan(0);
    expect(report.tasks).toHaveLength(2);
  });

  it('exports CSV', async () => {
    const o = await newOwner({ email: 'csv@ex.com', org: 'CsvCo' });
    await auth(request(app).post(`${base}/tasks`), o.token, o.orgId).send({ title: 'Exportable' });
    const res = await auth(request(app).get(`${base}/reports/export?format=csv&range=monthly`), o.token, o.orgId);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toMatch(/title,assignee,team,priority,status/);
    expect(res.text).toMatch(/Exportable/);
  });

  it('exports a PDF', async () => {
    const o = await newOwner({ email: 'pdf@ex.com', org: 'PdfCo' });
    await auth(request(app).post(`${base}/tasks`), o.token, o.orgId).send({ title: 'In the PDF' });
    const res = await auth(request(app).get(`${base}/reports/export?format=pdf&range=monthly`), o.token, o.orgId)
      .buffer(true)
      .parse((r, cb) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.body.slice(0, 5).toString()).toBe('%PDF-');
  });

  it('requires a teamId for a team-scoped report', async () => {
    const o = await newOwner({ email: 'team-rep@ex.com', org: 'TeamRep' });
    const res = await auth(request(app).get(`${base}/reports?scope=team`), o.token, o.orgId);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('TEAM_REQUIRED');
  });
});
