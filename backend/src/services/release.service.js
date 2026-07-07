import PDFDocument from 'pdfkit';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  VerticalAlign,
  AlignmentType,
  Footer,
  PageNumber,
} from 'docx';
import taskRepository from '../repositories/task.repository.js';
import releaseNoteRepository from '../repositories/releaseNote.repository.js';
import ApiError from '../utils/ApiError.js';
import config from '../config/index.js';
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  STATUS_HEX,
  PRIORITY_HEX,
  BRAND_HEX as BRAND,
  STATUS_ORDER,
  fmtDate,
  fmtRange,
} from '../utils/taskDisplay.js';

const hex = (h) => (h || '#333333').replace('#', '').toUpperCase();

const groupByStatus = (tasks) => {
  const groups = {};
  tasks.forEach((t) => {
    (groups[t.status] ||= []).push(t);
  });
  return groups;
};

const metaLine = (t) =>
  [PRIORITY_LABELS[t.priority] || t.priority, t.assignee, t.team]
    .filter(Boolean)
    .join(' · ')
    .concat(t.completedAt ? ` · completed ${fmtDate(t.completedAt)}` : '');

/**
 * Release notes: gather the tasks completed in a date range into a stable,
 * exportable snapshot, and render it (grouped by current status) as PDF/Word.
 */
class ReleaseService {
  autoTitle(from, to) {
    return `Release — ${fmtRange(from, to)}`;
  }

  /** Snapshot of tasks completed within [from, to]. */
  async gather(orgId, from, to) {
    const rows = await taskRepository.findAll(
      { organizationId: orgId, completedAt: { $gte: from, $lte: to } },
      {
        sort: { completedAt: -1 },
        populate: [
          { path: 'assigneeId', select: 'name' },
          { path: 'teamId', select: 'name' },
        ],
      },
    );
    return rows.map((t) => ({
      taskId: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignee: t.assigneeId?.name || 'Unassigned',
      team: t.teamId?.name || '',
      labels: t.labels || [],
      completedAt: t.completedAt,
      dueDate: t.dueDate,
      createdAt: t.createdAt,
    }));
  }

  summarize(tasks) {
    const byStatus = {};
    tasks.forEach((t) => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    });
    return { total: tasks.length, byStatus };
  }

  async create(orgId, userId, { from, to, version, title, details }) {
    const dateFrom = new Date(from);
    const dateTo = new Date(to);
    if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime()) || dateFrom > dateTo) {
      throw ApiError.badRequest('Provide a valid date range', { code: 'BAD_RANGE' });
    }
    // Make the range inclusive of both whole days.
    dateFrom.setHours(0, 0, 0, 0);
    dateTo.setHours(23, 59, 59, 999);
    const tasks = await this.gather(orgId, dateFrom, dateTo);
    return releaseNoteRepository.create({
      organizationId: orgId,
      title: title?.trim() || this.autoTitle(dateFrom, dateTo),
      version: version?.trim() || '',
      details: details || '',
      dateFrom,
      dateTo,
      tasks,
      summary: this.summarize(tasks),
      createdById: userId,
    });
  }

  list(orgId) {
    return releaseNoteRepository.listByOrg(orgId);
  }

  async get(orgId, id) {
    const note = await releaseNoteRepository.findByIdInOrg(id, orgId);
    if (!note) throw ApiError.notFound('Release note not found');
    return note;
  }

  async update(orgId, id, { title, version, details }) {
    const note = await this.get(orgId, id);
    if (title !== undefined) note.title = title.trim() || note.title;
    if (version !== undefined) note.version = version.trim();
    if (details !== undefined) note.details = details;
    await note.save();
    return note;
  }

  /** Re-take the task snapshot for the note's stored date range. */
  async regenerate(orgId, id) {
    const note = await this.get(orgId, id);
    const tasks = await this.gather(orgId, note.dateFrom, note.dateTo);
    note.tasks = tasks;
    note.summary = this.summarize(tasks);
    await note.save();
    return note;
  }

  async remove(orgId, id) {
    await this.get(orgId, id);
    await releaseNoteRepository.deleteById(id);
    return { id };
  }

  // ── PDF (portrait A4) — branded document ────────────────────────────────────
  toPdf(note, orgName) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50, bufferedPages: true });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const margin = doc.page.margins.left;
      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const usable = pageW - margin * 2;
      const total = note.summary?.total ?? note.tasks.length;

      // ── Full-bleed header banner ──
      doc.font('Helvetica-Bold').fontSize(21);
      const titleH = doc.heightOfString(note.title, { width: usable });
      const bandH = 40 + 12 + titleH + 12 + 14 + 26;
      doc.rect(0, 0, pageW, bandH).fill(BRAND);
      doc.rect(0, bandH - 5, pageW, 5).fill('#4a3cc7');
      doc.fillColor('#dbd8fd').font('Helvetica-Bold').fontSize(9).text(String(orgName || config.appName).toUpperCase(), margin, 30, { characterSpacing: 1.5, width: usable * 0.7 });
      doc.fillColor('#c1bbfb').fontSize(8.5).text('RELEASE NOTES', margin, 30, { width: usable, align: 'right', characterSpacing: 2 });
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(21).text(note.title, margin, 52, { width: usable });
      doc.fillColor('#ece9fe').font('Helvetica').fontSize(10.5).text([note.version && `Version ${note.version}`, fmtRange(note.dateFrom, note.dateTo)].filter(Boolean).join('     ·     '), margin, 52 + titleH + 10, { width: usable });

      // ── Summary stat strip ──
      const y = bandH + 22;
      const cardH = 52;
      doc.roundedRect(margin, y, usable, cardH, 8).fillAndStroke('#faf9f8', '#e6e3e0');
      const stats = [
        ['VERSION', note.version || '—'],
        ['PERIOD', fmtRange(note.dateFrom, note.dateTo)],
        ['TASKS SHIPPED', String(total)],
        ['GENERATED', new Date().toLocaleDateString('en-US')],
      ];
      const colW = usable / stats.length;
      stats.forEach((s, i) => {
        const x = margin + i * colW + 14;
        if (i > 0) doc.moveTo(margin + i * colW, y + 11).lineTo(margin + i * colW, y + cardH - 11).lineWidth(0.5).strokeColor('#e6e3e0').stroke();
        doc.fillColor('#9ca3af').font('Helvetica-Bold').fontSize(7).text(s[0], x, y + 12, { width: colW - 20, characterSpacing: 0.5 });
        doc.fillColor('#1b1917').font('Helvetica-Bold').fontSize(11).text(s[1], x, y + 26, { width: colW - 20, ellipsis: true, lineBreak: false });
      });
      doc.y = y + cardH + 24;
      doc.x = margin;

      const sectionLabel = (text, color = BRAND) => {
        if (doc.y > pageH - margin - 60) doc.addPage();
        doc.fillColor(color).font('Helvetica-Bold').fontSize(11).text(text, margin, doc.y, { characterSpacing: 1, width: usable });
        const ly = doc.y + 3;
        doc.moveTo(margin, ly).lineTo(margin + 32, ly).lineWidth(2).strokeColor(color).stroke();
        doc.y = ly + 12;
        doc.x = margin;
      };

      if (note.details && note.details.trim()) {
        sectionLabel('OVERVIEW');
        doc.fillColor('#333333').font('Helvetica').fontSize(10).text(note.details, margin, doc.y, { width: usable, lineGap: 3 });
        doc.moveDown(1);
      }

      const groups = groupByStatus(note.tasks);
      const hasTasks = note.tasks.length > 0;
      if (hasTasks) sectionLabel('WHAT SHIPPED');

      STATUS_ORDER.forEach((status) => {
        const items = groups[status];
        if (!items || !items.length) return;
        if (doc.y > pageH - margin - 72) doc.addPage();

        const c = STATUS_HEX[status] || '#333';
        const hy = doc.y;
        doc.circle(margin + 4, hy + 6, 3.5).fill(c);
        doc.fillColor('#1b1917').font('Helvetica-Bold').fontSize(12).text(STATUS_LABELS[status] || status, margin + 14, hy, { continued: true });
        doc.fillColor('#9ca3af').font('Helvetica').fontSize(10).text(`    ${items.length}`);
        doc.moveTo(margin, doc.y + 2).lineTo(margin + usable, doc.y + 2).lineWidth(0.5).strokeColor('#e6e3e0').stroke();
        doc.y += 8;

        items.forEach((t) => {
          if (doc.y > pageH - margin - 36) doc.addPage();
          const py = doc.y;
          doc.roundedRect(margin, py + 1.5, 3, 11, 1.5).fill(PRIORITY_HEX[t.priority] || '#999');
          doc.fillColor('#1b1917').font('Helvetica-Bold').fontSize(10.5).text(t.title, margin + 11, py, { width: usable - 11 });
          doc.fillColor('#6b7280').font('Helvetica').fontSize(8.5).text(metaLine(t), margin + 11, doc.y, { width: usable - 11 });
          doc.moveDown(0.55);
        });
        doc.moveDown(0.5);
      });

      if (!hasTasks) doc.fillColor('#9ca3af').font('Helvetica').fontSize(10).text('No tasks were completed in this range.', margin, doc.y, { width: usable });

      // ── Footer on every page ──
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);
        doc.page.margins.bottom = 0;
        const fy = pageH - 34;
        doc.moveTo(margin, fy).lineTo(margin + usable, fy).lineWidth(0.5).strokeColor('#e6e3e0').stroke();
        doc.fillColor('#9ca3af').font('Helvetica').fontSize(7.5).text(`${orgName || config.appName} · Release notes`, margin, fy + 7, { width: usable / 2, align: 'left', lineBreak: false });
        doc.text(`Page ${i + 1} of ${range.count}`, margin + usable / 2, fy + 7, { width: usable / 2, align: 'right', lineBreak: false });
      }

      doc.end();
    });
  }

  // ── Word (.docx) — branded document with tables ─────────────────────────────
  async toDocx(note, orgName) {
    const thin = { style: BorderStyle.SINGLE, size: 2, color: 'E6E3E0' };
    const cellBorders = { top: thin, bottom: thin, left: thin, right: thin };
    const noBorders = {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
    };
    const total = note.summary?.total ?? note.tasks.length;

    // Header banner (single shaded cell spanning the page).
    const banner = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, color: 'auto', fill: '6A4FE6' },
              borders: noBorders,
              margins: { top: 240, bottom: 240, left: 260, right: 260 },
              children: [
                new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: String(orgName || config.appName).toUpperCase(), color: 'DBD8FD', bold: true, size: 16 })] }),
                new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: note.title, color: 'FFFFFF', bold: true, size: 40 })] }),
                new Paragraph({ children: [new TextRun({ text: [note.version && `Version ${note.version}`, fmtRange(note.dateFrom, note.dateTo)].filter(Boolean).join('     ·     '), color: 'ECE9FE', size: 20 })] }),
              ],
            }),
          ],
        }),
      ],
    });

    // Summary stat strip.
    const stat = (label, value) =>
      new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        borders: cellBorders,
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'FAF9F8' },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: label, color: '9CA3AF', bold: true, size: 13 })] }),
          new Paragraph({ children: [new TextRun({ text: value, color: '1B1917', bold: true, size: 20 })] }),
        ],
      });
    const statStrip = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            stat('VERSION', note.version || '—'),
            stat('PERIOD', fmtRange(note.dateFrom, note.dateTo)),
            stat('TASKS SHIPPED', String(total)),
            stat('GENERATED', new Date().toLocaleDateString('en-US')),
          ],
        }),
      ],
    });

    const children = [banner, new Paragraph({ spacing: { after: 120 } }), statStrip, new Paragraph({ spacing: { after: 120 } })];

    if (note.details && note.details.trim()) {
      children.push(new Paragraph({ spacing: { before: 120, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: '6A4FE6' } }, children: [new TextRun({ text: 'OVERVIEW', bold: true, size: 20, color: '6A4FE6' })] }));
      note.details.split(/\n+/).forEach((p) => {
        if (p.trim()) children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: p.trim(), size: 20, color: '333333' })] }));
      });
    }

    const cell = (text, run, pct) =>
      new TableCell({
        width: { size: pct, type: WidthType.PERCENTAGE },
        borders: cellBorders,
        margins: { top: 60, bottom: 60, left: 110, right: 110 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: text || '', ...run })] })],
      });
    const COLS = [
      ['Task', 42],
      ['Priority', 13],
      ['Assignee', 18],
      ['Team', 15],
      ['Shipped', 12],
    ];

    const groups = groupByStatus(note.tasks);
    let printed = false;
    STATUS_ORDER.forEach((status) => {
      const items = groups[status];
      if (!items || !items.length) return;
      printed = true;
      children.push(new Paragraph({ spacing: { before: 220, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: hex(STATUS_HEX[status]) } }, children: [new TextRun({ text: `${STATUS_LABELS[status] || status}  (${items.length})`, bold: true, size: 24, color: hex(STATUS_HEX[status]) })] }));
      const header = new TableRow({
        tableHeader: true,
        children: COLS.map(([label, pct]) =>
          new TableCell({
            width: { size: pct, type: WidthType.PERCENTAGE },
            borders: cellBorders,
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F1EFEE' },
            margins: { top: 50, bottom: 50, left: 110, right: 110 },
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 15, color: '57524D' })] })],
          }),
        ),
      });
      const rows = items.map(
        (t) =>
          new TableRow({
            children: [
              cell(t.title, { bold: true, size: 16, color: '1B1917' }, 42),
              cell(PRIORITY_LABELS[t.priority] || t.priority, { bold: true, size: 15, color: hex(PRIORITY_HEX[t.priority]) }, 13),
              cell(t.assignee, { size: 15, color: '333333' }, 18),
              cell(t.team || '—', { size: 15, color: '333333' }, 15),
              cell(fmtDate(t.completedAt), { size: 15, color: '333333' }, 12),
            ],
          }),
      );
      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...rows] }));
    });
    if (!printed) children.push(new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: 'No tasks were completed in this range.', size: 20, color: '9CA3AF' })] }));

    const footer = new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `${orgName || config.appName} · Release notes · Page `, size: 14, color: '9CA3AF' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 14, color: '9CA3AF' }),
            new TextRun({ text: ' of ', size: 14, color: '9CA3AF' }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: '9CA3AF' }),
          ],
        }),
      ],
    });

    const doc = new Document({
      creator: config.appName,
      title: note.title,
      sections: [{ footers: { default: footer }, children }],
    });
    return Packer.toBuffer(doc);
  }
}

export default new ReleaseService();
