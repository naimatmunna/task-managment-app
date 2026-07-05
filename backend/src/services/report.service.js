import PDFDocument from 'pdfkit';
import taskRepository from '../repositories/task.repository.js';
import teamRepository from '../repositories/team.repository.js';
import emailService from './email.service.js';
import ApiError from '../utils/ApiError.js';
import config from '../config/index.js';
import { TASK_STATUS, TASK_STATUS_VALUES } from '../constants/taskEnums.js';

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/**
 * On-demand reporting. Aggregates org-scoped tasks over a date range and scope
 * (org | team | me) into summary metrics, breakdowns and chart series, and can
 * render the same data as CSV or a branded PDF.
 */
class ReportService {
  resolveRange({ range = 'weekly', from, to } = {}) {
    const now = new Date();
    if (range === 'custom' && from && to) {
      return { key: 'custom', from: new Date(from), to: new Date(to) };
    }
    if (range === 'daily') return { key: 'daily', from: startOfDay(now), to: now };
    if (range === 'monthly') return { key: 'monthly', from: new Date(now.getTime() - 30 * DAY), to: now };
    return { key: 'weekly', from: new Date(now.getTime() - 7 * DAY), to: now };
  }

  async buildScopeFilter(orgId, { scope = 'org', teamId }, userId) {
    const filter = { organizationId: orgId };
    if (scope === 'me') filter.assigneeId = userId;
    if (scope === 'team') {
      if (!teamId) throw ApiError.badRequest('teamId is required for a team report', { code: 'TEAM_REQUIRED' });
      const team = await teamRepository.findByIdInOrg(teamId, orgId);
      if (!team) throw ApiError.notFound('Team not found');
      filter.teamId = teamId;
    }
    return filter;
  }

  /** Build the full structured report. */
  async generate(orgId, userId, query = {}) {
    const range = this.resolveRange(query);
    const scopeFilter = await this.buildScopeFilter(orgId, query, userId);

    // Tasks created within the range (the report's working set).
    const filter = { ...scopeFilter, createdAt: { $gte: range.from, $lte: range.to } };
    const tasks = await taskRepository.findAll(filter, {
      sort: { status: 1, createdAt: -1 },
      populate: [{ path: 'assigneeId', select: 'name email' }, { path: 'teamId', select: 'name' }],
    });

    const now = new Date();
    const byStatus = Object.fromEntries(TASK_STATUS_VALUES.map((s) => [s, 0]));
    const workload = new Map();
    const trend = new Map();
    let completed = 0;
    let overdue = 0;

    for (const t of tasks) {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      if (t.status === TASK_STATUS.DONE) {
        completed += 1;
        if (t.completedAt) {
          const day = startOfDay(t.completedAt).toISOString().slice(0, 10);
          trend.set(day, (trend.get(day) || 0) + 1);
        }
      }
      if (t.dueDate && t.status !== TASK_STATUS.DONE && new Date(t.dueDate) < now) overdue += 1;

      const key = t.assigneeId ? t.assigneeId.name : 'Unassigned';
      const w = workload.get(key) || { assignee: key, total: 0, completed: 0 };
      w.total += 1;
      if (t.status === TASK_STATUS.DONE) w.completed += 1;
      workload.set(key, w);
    }

    const total = tasks.length;
    const summary = {
      total,
      completed,
      inProgress: byStatus[TASK_STATUS.IN_PROGRESS] || 0,
      overdue,
      completionRate: total ? Math.round((completed / total) * 100) : 0,
    };

    return {
      generatedAt: now.toISOString(),
      range: { key: range.key, from: range.from.toISOString(), to: range.to.toISOString() },
      scope: query.scope || 'org',
      summary,
      byStatus: TASK_STATUS_VALUES.map((s) => ({ status: s, count: byStatus[s] || 0 })),
      completionTrend: [...trend.entries()].sort().map(([date, count]) => ({ date, count })),
      workloadByAssignee: [...workload.values()].sort((a, b) => b.total - a.total),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        assignee: t.assigneeId?.name || 'Unassigned',
        team: t.teamId?.name || '',
        priority: t.priority,
        status: t.status,
        createdAt: t.createdAt,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
      })),
    };
  }

  /** CSV of the task list (RFC-4180 quoting). */
  toCsv(report) {
    const cols = ['title', 'assignee', 'team', 'priority', 'status', 'createdAt', 'dueDate', 'completedAt'];
    const esc = (v) => {
      const s = v == null ? '' : String(v instanceof Date ? v.toISOString() : v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = cols.join(',');
    const rows = report.tasks.map((t) => cols.map((c) => esc(t[c])).join(','));
    return [header, ...rows].join('\n');
  }

  /** Render the report as a branded PDF and resolve a Buffer. */
  toPdf(report) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, size: 'A4' });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-US') : '—');

      doc.fillColor('#4f46e5').fontSize(20).text(`${config.appName} Report`, { continued: false });
      doc
        .moveDown(0.2)
        .fillColor('#6b7280')
        .fontSize(10)
        .text(`Scope: ${report.scope} · ${report.range.key} · ${fmt(report.range.from)} – ${fmt(report.range.to)}`);

      doc.moveDown(1).fillColor('#111827').fontSize(13).text('Summary');
      doc.moveDown(0.3).fillColor('#374151').fontSize(10);
      const s = report.summary;
      doc.text(`Total: ${s.total}    Completed: ${s.completed}    In progress: ${s.inProgress}    Overdue: ${s.overdue}    Completion: ${s.completionRate}%`);

      doc.moveDown(1).fillColor('#111827').fontSize(13).text('Tasks');
      doc.moveDown(0.4).fontSize(9);
      report.tasks.forEach((t) => {
        doc
          .fillColor('#111827')
          .text(`• ${t.title}`, { continued: false })
          .fillColor('#6b7280')
          .text(`   ${t.status} · ${t.priority} · ${t.assignee} · due ${fmt(t.dueDate)}`);
      });
      if (report.tasks.length === 0) doc.fillColor('#9ca3af').text('No tasks in this range.');

      doc.end();
    });
  }

  /** Generate the report and email it to the requesting user with CSV + PDF attached. */
  async emailReport(orgId, user, query = {}) {
    const report = await this.generate(orgId, user.id, query);
    const [csv, pdf] = [this.toCsv(report), await this.toPdf(report)];
    const s = report.summary;

    await emailService.sendReportEmail(user.email, {
      subject: `Your ${config.appName} ${report.range.key} report`,
      summaryHtml: `
        <p>Your <strong>${report.range.key}</strong> report (${report.scope}) is attached as CSV and PDF.</p>
        <p style="color:#374151;">Total ${s.total} · Completed ${s.completed} · In progress ${s.inProgress} · Overdue ${s.overdue} · Completion ${s.completionRate}%</p>`,
      attachments: [
        { filename: 'propvia-report.csv', content: csv },
        { filename: 'propvia-report.pdf', content: pdf },
      ],
    });
    return report.summary;
  }
}

export default new ReportService();
