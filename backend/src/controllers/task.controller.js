import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import taskService from '../services/task.service.js';
import taskExportService from '../services/taskExport.service.js';

export const listTasks = catchAsync(async (req, res) => {
  const { items, meta } = await taskService.list(req.orgId, req.validatedQuery);
  return ApiResponse.send(res, { data: { tasks: items }, meta });
});

export const boardTasks = catchAsync(async (req, res) => {
  const tasks = await taskService.board(req.orgId, req.validatedQuery);
  return ApiResponse.send(res, { data: { tasks } });
});

export const listTaskIds = catchAsync(async (req, res) => {
  const ids = await taskService.listIds(req.orgId, req.validatedQuery);
  return ApiResponse.send(res, { data: { ids }, meta: { total: ids.length } });
});

export const exportTasks = catchAsync(async (req, res) => {
  const { format, scopeLabel, ...filters } = req.validatedQuery;
  const { org, tasks } = await taskExportService.gather(req.orgId, filters);
  const meta = { scopeLabel: scopeLabel || 'All tasks', generatedAt: new Date() };
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'docx') {
    const buffer = await taskExportService.toDocx({ org, tasks, meta });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="task-list-${stamp}.docx"`);
    return res.send(buffer);
  }

  const pdf = await taskExportService.toPdf({ org, tasks, meta });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="task-list-${stamp}.pdf"`);
  return res.send(pdf);
});

export const getTask = catchAsync(async (req, res) => {
  const task = await taskService.get(req.orgId, req.params.id);
  return ApiResponse.send(res, { data: { task } });
});

export const createTask = catchAsync(async (req, res) => {
  const task = await taskService.create(req.orgId, req.user.id, req.body);
  return ApiResponse.created(res, { message: 'Task created', data: { task } });
});

export const updateTask = catchAsync(async (req, res) => {
  const task = await taskService.update(req.orgId, req.user.id, req.params.id, req.body);
  return ApiResponse.send(res, { message: 'Task updated', data: { task } });
});

export const reorderTask = catchAsync(async (req, res) => {
  const task = await taskService.reorder(req.orgId, req.user.id, req.params.id, req.body);
  return ApiResponse.send(res, { data: { task } });
});

export const commentTask = catchAsync(async (req, res) => {
  const task = await taskService.addComment(
    req.orgId,
    req.user.id,
    req.params.id,
    req.body.message,
    req.body.mentions,
  );
  return ApiResponse.send(res, { message: 'Comment added', data: { task } });
});

export const deleteTask = catchAsync(async (req, res) => {
  await taskService.remove(req.orgId, req.params.id);
  return ApiResponse.send(res, { message: 'Task deleted' });
});

export const addSubtask = catchAsync(async (req, res) => {
  const task = await taskService.addSubtask(req.orgId, req.params.id, req.body.title);
  return ApiResponse.created(res, { message: 'Subtask added', data: { task } });
});

export const updateSubtask = catchAsync(async (req, res) => {
  const task = await taskService.updateSubtask(req.orgId, req.params.id, req.params.subId, req.body);
  return ApiResponse.send(res, { data: { task } });
});

export const deleteSubtask = catchAsync(async (req, res) => {
  const task = await taskService.removeSubtask(req.orgId, req.params.id, req.params.subId);
  return ApiResponse.send(res, { message: 'Subtask removed', data: { task } });
});

export const addAttachment = catchAsync(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded', { code: 'NO_FILE' });
  const task = await taskService.addAttachment(req.orgId, req.user.id, req.params.id, req.file);
  return ApiResponse.created(res, { message: 'Attachment added', data: { task } });
});

export const deleteAttachment = catchAsync(async (req, res) => {
  const task = await taskService.removeAttachment(req.orgId, req.params.id, req.params.attId);
  return ApiResponse.send(res, { message: 'Attachment removed', data: { task } });
});
