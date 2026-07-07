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
  AlignmentType,
  PageOrientation,
} from 'docx';
import taskService from './task.service.js';
import organizationRepository from '../repositories/organization.repository.js';
import config from '../config/index.js';
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  STATUS_HEX,
  PRIORITY_HEX,
  BRAND_HEX as BRAND,
  fmtDate,
} from '../utils/taskDisplay.js';

/** Column model shared by both renderers (pct = docx width, frac = pdf width). */
const COLS = [
  { key: 'idx', label: '#', pct: 4, frac: 0.04 },
  { key: 'title', label: 'Task', pct: 25, frac: 0.25 },
  { key: 'assignee', label: 'Assignee', pct: 15, frac: 0.15 },
  { key: 'status', label: 'Status', pct: 11, frac: 0.11 },
  { key: 'priority', label: 'Priority', pct: 9, frac: 0.09 },
  { key: 'team', label: 'Team', pct: 13, frac: 0.13 },
  { key: 'due', label: 'Due', pct: 11, frac: 0.11 },
  { key: 'created', label: 'Created', pct: 12, frac: 0.12 },
];

const cellValue = (task, key, index) => {
  switch (key) {
    case 'idx':
      return String(index + 1);
    case 'title':
      return task.title || '';
    case 'assignee':
      return task.assigneeId?.name || 'Unassigned';
    case 'status':
      return STATUS_LABELS[task.status] || task.status;
    case 'priority':
      return PRIORITY_LABELS[task.priority] || task.priority;
    case 'team':
      return task.teamId?.name || '—';
    case 'due':
      return fmtDate(task.dueDate);
    case 'created':
      return fmtDate(task.createdAt);
    default:
      return '';
  }
};

/**
 * Renders a filtered task list as a branded PDF or Word document. Both share
 * the same column model and header block so the two formats stay in sync.
 */
class TaskExportService {
  async gather(orgId, query) {
    const [org, tasks] = await Promise.all([
      organizationRepository.findById(orgId),
      taskService.collect(orgId, query),
    ]);
    return { org, tasks };
  }

  // ── PDF (landscape A4) ─────────────────────────────────────────────────────
  toPdf({ org, tasks, meta }) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40, bufferedPages: true });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const margin = doc.page.margins.left;
      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const usable = pageW - margin * 2;

      // Column x/width geometry.
      let cx = margin;
      const cols = COLS.map((c) => {
        const w = c.frac * usable;
        const col = { ...c, x: cx, w };
        cx += w;
        return col;
      });

      // ── Header block ──
      doc.fillColor(BRAND).font('Helvetica-Bold').fontSize(9).text(String(org?.name || config.appName).toUpperCase(), margin, margin, { characterSpacing: 1 });
      doc.fillColor('#111827').font('Helvetica-Bold').fontSize(20).text('Task List Report', margin, margin + 14);
      doc
        .fillColor('#6b7280')
        .font('Helvetica')
        .fontSize(9.5)
        .text(
          `${meta.scopeLabel}   ·   ${tasks.length} task${tasks.length === 1 ? '' : 's'}   ·   Generated ${new Date(meta.generatedAt).toLocaleString('en-US')}`,
          margin,
          margin + 40,
        );
      let y = margin + 62;
      doc.moveTo(margin, y).lineTo(margin + usable, y).lineWidth(1).strokeColor('#e6e3e0').stroke();
      y += 8;

      const headerH = 22;
      const rowH = 20;

      const drawHeader = (yy) => {
        doc.rect(margin, yy, usable, headerH).fill('#f1efee');
        doc.fillColor('#1b1917').font('Helvetica-Bold').fontSize(8.5);
        cols.forEach((c) =>
          doc.text(c.label, c.x + 5, yy + 7, { width: c.w - 10, ellipsis: true, lineBreak: false }),
        );
        return yy + headerH;
      };

      y = drawHeader(y);

      tasks.forEach((task, i) => {
        if (y + rowH > pageH - margin - 6) {
          doc.addPage();
          y = margin;
          y = drawHeader(y);
        }
        if (i % 2 === 1) doc.rect(margin, y, usable, rowH).fill('#faf9f8');

        cols.forEach((c) => {
          const val = cellValue(task, c.key, i);
          let color = '#333333';
          let font = 'Helvetica';
          if (c.key === 'status') color = STATUS_HEX[task.status] || '#333';
          if (c.key === 'priority') {
            color = PRIORITY_HEX[task.priority] || '#333';
            font = 'Helvetica-Bold';
          }
          if (c.key === 'title') font = 'Helvetica-Bold';
          doc
            .fillColor(color)
            .font(font)
            .fontSize(8)
            .text(val, c.x + 5, y + 6, { width: c.w - 10, ellipsis: true, lineBreak: false });
        });
        y += rowH;
      });

      if (tasks.length === 0) {
        doc.fillColor('#9ca3af').font('Helvetica').fontSize(10).text('No tasks match this selection.', margin, y + 12);
      }

      // Page-number footer. Writing below the bottom margin makes pdfkit spawn
      // an extra blank page, so temporarily drop the bottom margin per page.
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);
        doc.page.margins.bottom = 0;
        doc
          .fillColor('#9ca3af')
          .font('Helvetica')
          .fontSize(7.5)
          .text(`${config.appName} · Page ${i + 1} of ${range.count}`, margin, pageH - 26, {
            width: usable,
            align: 'center',
            lineBreak: false,
          });
      }

      doc.end();
    });
  }

  // ── Word (.docx, landscape) ─────────────────────────────────────────────────
  async toDocx({ org, tasks, meta }) {
    const thin = { style: BorderStyle.SINGLE, size: 2, color: 'E6E3E0' };
    const cellBorders = { top: thin, bottom: thin, left: thin, right: thin };

    const headerRow = new TableRow({
      tableHeader: true,
      children: COLS.map(
        (c) =>
          new TableCell({
            width: { size: c.pct, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, color: 'auto', fill: '6A4FE6' },
            borders: cellBorders,
            margins: { top: 40, bottom: 40, left: 90, right: 90 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: c.label, bold: true, color: 'FFFFFF', size: 16 })],
              }),
            ],
          }),
      ),
    });

    const dataRows = tasks.map(
      (task, i) =>
        new TableRow({
          children: COLS.map((c) => {
            const val = cellValue(task, c.key, i);
            let color = '333333';
            let bold = false;
            if (c.key === 'status') color = (STATUS_HEX[task.status] || '#333').slice(1).toUpperCase();
            if (c.key === 'priority') {
              color = (PRIORITY_HEX[task.priority] || '#333').slice(1).toUpperCase();
              bold = true;
            }
            if (c.key === 'title') bold = true;
            return new TableCell({
              width: { size: c.pct, type: WidthType.PERCENTAGE },
              shading: i % 2 ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F7F6F5' } : undefined,
              borders: cellBorders,
              margins: { top: 40, bottom: 40, left: 90, right: 90 },
              children: [new Paragraph({ children: [new TextRun({ text: val, size: 15, color, bold })] })],
            });
          }),
        }),
    );

    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    });

    const doc = new Document({
      creator: config.appName,
      title: 'Task List Report',
      sections: [
        {
          properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: String(org?.name || config.appName).toUpperCase(), bold: true, color: '6A4FE6', size: 18 }),
              ],
              spacing: { after: 40 },
            }),
            new Paragraph({
              children: [new TextRun({ text: 'Task List Report', bold: true, size: 40, color: '111827' })],
              spacing: { after: 60 },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `${meta.scopeLabel}   ·   ${tasks.length} task${tasks.length === 1 ? '' : 's'}   ·   Generated ${new Date(meta.generatedAt).toLocaleString('en-US')}`,
                  size: 18,
                  color: '6B7280',
                }),
              ],
              spacing: { after: 220 },
            }),
            table,
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 240 },
              children: [new TextRun({ text: `${config.appName} · Task management`, size: 14, color: '9CA3AF' })],
            }),
          ],
        },
      ],
    });

    return Packer.toBuffer(doc);
  }
}

export default new TaskExportService();
