import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/ApiResponse.js';
import releaseService from '../services/release.service.js';
import organizationRepository from '../repositories/organization.repository.js';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const listReleases = catchAsync(async (req, res) => {
  const releaseNotes = await releaseService.list(req.orgId);
  return ApiResponse.send(res, { data: { releaseNotes } });
});

export const getRelease = catchAsync(async (req, res) => {
  const releaseNote = await releaseService.get(req.orgId, req.params.id);
  return ApiResponse.send(res, { data: { releaseNote } });
});

export const createRelease = catchAsync(async (req, res) => {
  const { note, result } = await releaseService.create(req.orgId, req.user.id, req.body);
  const message =
    result.skipped > 0
      ? `Release note generated · ${result.skipped} selected task${result.skipped > 1 ? 's' : ''} could not be added (deleted or no longer accessible).`
      : 'Release note generated';
  return ApiResponse.created(res, { message, data: { releaseNote: note, result } });
});

export const updateRelease = catchAsync(async (req, res) => {
  const releaseNote = await releaseService.update(req.orgId, req.params.id, req.body);
  return ApiResponse.send(res, { message: 'Release note updated', data: { releaseNote } });
});

export const regenerateRelease = catchAsync(async (req, res) => {
  const releaseNote = await releaseService.regenerate(req.orgId, req.params.id);
  return ApiResponse.send(res, { message: 'Release note regenerated', data: { releaseNote } });
});

export const deleteRelease = catchAsync(async (req, res) => {
  await releaseService.remove(req.orgId, req.params.id);
  return ApiResponse.send(res, { message: 'Release note deleted' });
});

export const exportRelease = catchAsync(async (req, res) => {
  const note = await releaseService.get(req.orgId, req.params.id);
  const org = await organizationRepository.findById(req.orgId);
  const { format } = req.validatedQuery;
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'docx') {
    const buffer = await releaseService.toDocx(note, org?.name);
    res.setHeader('Content-Type', DOCX_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="release-${stamp}.docx"`);
    return res.send(buffer);
  }
  const pdf = await releaseService.toPdf(note, org?.name);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="release-${stamp}.pdf"`);
  return res.send(pdf);
});
