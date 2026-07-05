import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/ApiResponse.js';
import orgService from '../services/org.service.js';
import { setRefreshCookie } from '../helpers/cookie.js';

export const createOrg = catchAsync(async (req, res) => {
  const org = await orgService.createOrg(req.user.id, req.body);
  return ApiResponse.created(res, { message: 'Organization created', data: { organization: org } });
});

export const getOrg = catchAsync(async (req, res) => {
  const { org, memberCount } = await orgService.getOrg(req.orgId);
  return ApiResponse.send(res, { data: { organization: org, memberCount } });
});

export const updateOrg = catchAsync(async (req, res) => {
  const org = await orgService.updateOrg(req.orgId, req.body);
  return ApiResponse.send(res, { message: 'Organization updated', data: { organization: org } });
});

export const listMembers = catchAsync(async (req, res) => {
  const members = await orgService.listMembers(req.orgId);
  return ApiResponse.send(res, { data: { members } });
});

export const inviteMember = catchAsync(async (req, res) => {
  const { membership, devToken } = await orgService.inviteMember(req.orgId, req.user, req.body);
  return ApiResponse.created(res, {
    message: 'Invitation sent',
    data: { membership, devToken },
  });
});

export const updateMemberRole = catchAsync(async (req, res) => {
  const membership = await orgService.updateMemberRole(req.orgId, req.params.id, req.body.role);
  return ApiResponse.send(res, { message: 'Role updated', data: { membership } });
});

export const removeMember = catchAsync(async (req, res) => {
  await orgService.removeMember(req.orgId, req.params.id, req.user.id);
  return ApiResponse.send(res, { message: 'Member removed' });
});

// ── Public invite endpoints (no auth / no org context) ──────────────────────

export const peekInvite = catchAsync(async (req, res) => {
  const info = await orgService.peekInvite(req.validatedQuery.token);
  return ApiResponse.send(res, { data: info });
});

export const acceptInvite = catchAsync(async (req, res) => {
  const { user, tokens, memberships } = await orgService.acceptInvite(req.body);
  setRefreshCookie(res, tokens.refreshToken);
  return ApiResponse.send(res, {
    message: 'Invitation accepted',
    data: { user, accessToken: tokens.accessToken, memberships },
  });
});
