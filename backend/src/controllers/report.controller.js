import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/ApiResponse.js';
import reportService from '../services/report.service.js';

export const getReport = catchAsync(async (req, res) => {
  const report = await reportService.generate(req.orgId, req.user.id, req.validatedQuery);
  return ApiResponse.send(res, { data: { report } });
});

export const exportReport = catchAsync(async (req, res) => {
  const { format } = req.validatedQuery;
  const report = await reportService.generate(req.orgId, req.user.id, req.validatedQuery);
  const stamp = new Date(report.generatedAt).toISOString().slice(0, 10);

  if (format === 'pdf') {
    const pdf = await reportService.toPdf(report);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="propvia-report-${stamp}.pdf"`);
    return res.send(pdf);
  }

  const csv = reportService.toCsv(report);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="propvia-report-${stamp}.csv"`);
  return res.send(csv);
});

export const emailReport = catchAsync(async (req, res) => {
  const summary = await reportService.emailReport(req.orgId, req.user, req.validatedQuery);
  return ApiResponse.send(res, { message: 'Report emailed to you', data: { summary } });
});
