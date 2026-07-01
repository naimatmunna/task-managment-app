import { ROLES } from '../constants/roles.js';

/**
 * Factory Pattern: builds consistent User payloads for seeds/tests.
 * Overrides let callers customize any field.
 */
export const buildUser = (overrides = {}) => ({
  name: 'Test User',
  email: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`,
  password: 'Password123!',
  roles: [ROLES.USER],
  isActive: true,
  isEmailVerified: true,
  ...overrides,
});
