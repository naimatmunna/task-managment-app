import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/ApiResponse.js';
import userService from '../services/user.service.js';
import { MESSAGES } from '../constants/messages.js';

export const listUsers = catchAsync(async (req, res) => {
  const { items, meta } = await userService.list(req.query);
  return ApiResponse.send(res, { message: MESSAGES.USER.LIST_FETCHED, data: items, meta });
});

export const getUser = catchAsync(async (req, res) => {
  const user = await userService.getById(req.params.id);
  return ApiResponse.send(res, { message: MESSAGES.USER.FETCHED, data: { user } });
});

export const createUser = catchAsync(async (req, res) => {
  const user = await userService.create(req.body);
  return ApiResponse.created(res, { message: MESSAGES.USER.CREATED, data: { user } });
});

export const updateUser = catchAsync(async (req, res) => {
  const user = await userService.update(req.params.id, req.body);
  return ApiResponse.send(res, { message: MESSAGES.USER.UPDATED, data: { user } });
});

export const deleteUser = catchAsync(async (req, res) => {
  await userService.remove(req.params.id);
  return ApiResponse.send(res, { message: MESSAGES.USER.DELETED });
});
