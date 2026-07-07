import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/ApiResponse.js';
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
  const task = await taskService.addComment(req.orgId, req.user.id, req.params.id, req.body.message);
  return ApiResponse.send(res, { message: 'Comment added', data: { task } });
});

export const deleteTask = catchAsync(async (req, res) => {
  await taskService.remove(req.orgId, req.params.id);
  return ApiResponse.send(res, { message: 'Task deleted' });
});
