/** In-app + email notification kinds. */
export const NOTIFICATION_TYPE = Object.freeze({
  TASK_ASSIGNED: 'task_assigned',
  TASK_DUE_SOON: 'task_due_soon',
  TASK_MENTION: 'task_mention',
  MEMBER_INVITED: 'member_invited',
  REPORT_READY: 'report_ready',
});

export const NOTIFICATION_TYPE_VALUES = Object.freeze(Object.values(NOTIFICATION_TYPE));
