import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/ApiResponse.js';
import teamService from '../services/team.service.js';

export const listTeams = catchAsync(async (req, res) => {
  const teams = await teamService.list(req.orgId);
  return ApiResponse.send(res, { data: { teams } });
});

export const getTeam = catchAsync(async (req, res) => {
  const team = await teamService.get(req.orgId, req.params.id);
  return ApiResponse.send(res, { data: { team } });
});

export const createTeam = catchAsync(async (req, res) => {
  const team = await teamService.create(req.orgId, req.body);
  return ApiResponse.created(res, { message: 'Team created', data: { team } });
});

export const updateTeam = catchAsync(async (req, res) => {
  const team = await teamService.update(req.orgId, req.params.id, req.body);
  return ApiResponse.send(res, { message: 'Team updated', data: { team } });
});

export const deleteTeam = catchAsync(async (req, res) => {
  await teamService.remove(req.orgId, req.params.id);
  return ApiResponse.send(res, { message: 'Team deleted' });
});
