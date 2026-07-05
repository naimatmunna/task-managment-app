/** Task lifecycle columns (Kanban board maps 1:1 to these). */
export const TASK_STATUS = Object.freeze({
  BACKLOG: 'backlog',
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  DONE: 'done',
});

export const TASK_STATUS_VALUES = Object.freeze(Object.values(TASK_STATUS));

export const TASK_PRIORITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
});

export const TASK_PRIORITY_VALUES = Object.freeze(Object.values(TASK_PRIORITY));

/** Activity-log entry kinds recorded on a task. */
export const TASK_ACTIVITY = Object.freeze({
  CREATED: 'created',
  UPDATED: 'updated',
  STATUS_CHANGED: 'status_changed',
  ASSIGNED: 'assigned',
  UNASSIGNED: 'unassigned',
  COMMENTED: 'commented',
});
