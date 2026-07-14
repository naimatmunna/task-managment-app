import { z } from 'zod';
import { TASK_STATUS_VALUES, TASK_PRIORITY_VALUES } from '../constants/taskEnums.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const nullableId = z.union([objectId, z.null()]);
const nullableDate = z.union([z.coerce.date(), z.null()]);
const status = z.enum(TASK_STATUS_VALUES);
const priority = z.enum(TASK_PRIORITY_VALUES);

export const createTaskSchema = {
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(5000).optional(),
    status: status.optional(),
    priority: priority.optional(),
    assigneeId: nullableId.optional(),
    teamId: nullableId.optional(),
    dueDate: nullableDate.optional(),
    labels: z.array(z.string().max(40)).max(20).optional(),
  }),
};

export const updateTaskSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(5000).optional(),
    status: status.optional(),
    priority: priority.optional(),
    assigneeId: nullableId.optional(),
    teamId: nullableId.optional(),
    dueDate: nullableDate.optional(),
    labels: z.array(z.string().max(40)).max(20).optional(),
    order: z.number().optional(),
  }),
};

export const reorderSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ status, order: z.number() }),
};

export const commentSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    message: z.string().min(1).max(2000),
    // User ids @-mentioned in the comment; each is notified.
    mentions: z.array(objectId).max(20).optional(),
  }),
};

export const taskIdSchema = {
  params: z.object({ id: objectId }),
};

export const addSubtaskSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ title: z.string().min(1, 'Title is required').max(300) }),
};

export const updateSubtaskSchema = {
  params: z.object({ id: objectId, subId: objectId }),
  body: z
    .object({
      title: z.string().min(1).max(300).optional(),
      done: z.boolean().optional(),
    })
    .refine((b) => b.title !== undefined || b.done !== undefined, {
      message: 'Nothing to update',
    }),
};

export const subtaskIdSchema = {
  params: z.object({ id: objectId, subId: objectId }),
};

export const attachmentIdSchema = {
  params: z.object({ id: objectId, attId: objectId }),
};

export const listTasksSchema = {
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    assigneeId: z.string().optional(),
    teamId: z.string().optional(),
    label: z.string().optional(),
    search: z.string().optional(),
    sort: z.string().optional(),
    dueBefore: z.string().optional(),
    dueAfter: z.string().optional(),
    completedBefore: z.string().optional(),
    completedAfter: z.string().optional(),
    overdue: z.string().optional(),
  }),
};

export const exportTasksSchema = {
  query: z.object({
    format: z.enum(['pdf', 'docx']).default('pdf'),
    scopeLabel: z.string().max(200).optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    assigneeId: z.string().optional(),
    teamId: z.string().optional(),
    label: z.string().optional(),
    search: z.string().optional(),
    dueBefore: z.string().optional(),
    dueAfter: z.string().optional(),
    overdue: z.string().optional(),
  }),
};
