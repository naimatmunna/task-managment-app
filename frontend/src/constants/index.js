export const STORAGE_KEYS = Object.freeze({
  ACCESS_TOKEN: 'access_token',
  ACTIVE_ORG: 'active_org',
  THEME: 'theme',
});

/** Platform-level roles (legacy super-admin tooling). Product uses ORG_ROLES. */
export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
});

/** Organization-scoped roles that gate all product actions. */
export const ORG_ROLES = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
});

export const ORG_ROLE_RANK = Object.freeze({ member: 1, admin: 2, owner: 3 });

export const ROUTES = Object.freeze({
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  VERIFY_OTP: '/verify-otp',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  ACCEPT_INVITE: '/accept-invite',

  APP: '/app',
  BOARD: '/app/board',
  LIST: '/app/list',
  TEAMS: '/app/teams',
  REPORTS: '/app/reports',
  MEMBERS: '/app/members',
  SETTINGS: '/app/settings',
  PROFILE: '/app/profile',

  NOT_FOUND: '/404',
});

export const TASK_STATUS = Object.freeze({
  BACKLOG: 'backlog',
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  DONE: 'done',
});

/** Ordered board columns with display labels. */
export const TASK_COLUMNS = Object.freeze([
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'in_review', label: 'In Review' },
  { key: 'done', label: 'Done' },
]);

export const TASK_PRIORITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
});

/** Priority chip styling — frosted translucent pills with a hairline ring (light + dark). */
export const PRIORITY_META = Object.freeze({
  low: {
    label: 'Low',
    className:
      'badge-glass bg-gray-500/10 text-gray-600 ring-1 ring-inset ring-gray-500/20 dark:bg-gray-400/10 dark:text-gray-300 dark:ring-white/10',
  },
  medium: {
    label: 'Medium',
    className:
      'badge-glass bg-info-500/15 text-info-700 ring-1 ring-inset ring-info-500/25 dark:bg-info-500/15 dark:text-info-400 dark:ring-info-500/25',
  },
  high: {
    label: 'High',
    className:
      'badge-glass bg-warning-500/15 text-warning-700 ring-1 ring-inset ring-warning-500/30 dark:bg-warning-500/15 dark:text-warning-500 dark:ring-warning-500/25',
  },
  urgent: {
    label: 'Urgent',
    className:
      'badge-glass bg-danger-500/15 text-danger-700 ring-1 ring-inset ring-danger-500/30 dark:bg-danger-500/15 dark:text-danger-400 dark:ring-danger-500/25',
  },
});

/**
 * Board/task status. `color` drives the board column accent + charts; `chip`
 * is the frosted glassy badge style so a status never reads as flat grey.
 */
export const STATUS_META = Object.freeze({
  backlog: {
    label: 'Backlog',
    color: '#a8a39d',
    chip: 'badge-glass bg-gray-500/10 text-gray-600 ring-1 ring-inset ring-gray-500/20 dark:bg-gray-400/10 dark:text-gray-300 dark:ring-white/10',
  },
  todo: {
    label: 'To Do',
    color: '#3b82f6',
    chip: 'badge-glass bg-info-500/15 text-info-700 ring-1 ring-inset ring-info-500/25 dark:bg-info-500/15 dark:text-info-400 dark:ring-info-500/25',
  },
  in_progress: {
    label: 'In Progress',
    color: '#6a4fe6',
    chip: 'badge-glass bg-brand-500/15 text-brand-700 ring-1 ring-inset ring-brand-500/25 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/25',
  },
  in_review: {
    label: 'In Review',
    color: '#f59e0b',
    chip: 'badge-glass bg-warning-500/15 text-warning-700 ring-1 ring-inset ring-warning-500/30 dark:bg-warning-500/15 dark:text-warning-500 dark:ring-warning-500/25',
  },
  done: {
    label: 'Done',
    color: '#10b981',
    chip: 'badge-glass bg-success-500/15 text-success-700 ring-1 ring-inset ring-success-500/25 dark:bg-success-500/15 dark:text-success-500 dark:ring-success-500/25',
  },
});

/** Organization-role badge styling (frosted). */
export const ROLE_META = Object.freeze({
  owner: 'badge-glass bg-brand-500/15 text-brand-700 ring-1 ring-inset ring-brand-500/25 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/25',
  admin: 'badge-glass bg-violet-500/15 text-violet-700 ring-1 ring-inset ring-violet-500/25 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/25',
  member: 'badge-glass bg-gray-500/10 text-gray-600 ring-1 ring-inset ring-gray-500/20 dark:bg-gray-400/10 dark:text-gray-300 dark:ring-white/10',
});

/** Membership-status badge styling (frosted). */
export const MEMBER_STATUS_META = Object.freeze({
  active: 'badge-glass bg-success-500/15 text-success-700 ring-1 ring-inset ring-success-500/25 dark:bg-success-500/15 dark:text-success-500 dark:ring-success-500/25',
  invited: 'badge-glass bg-warning-500/15 text-warning-700 ring-1 ring-inset ring-warning-500/30 dark:bg-warning-500/15 dark:text-warning-500 dark:ring-warning-500/25',
  disabled: 'badge-glass bg-gray-500/10 text-gray-500 ring-1 ring-inset ring-gray-500/20 dark:bg-gray-400/10 dark:text-gray-400 dark:ring-white/10',
});
