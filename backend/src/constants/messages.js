/** Centralized, reusable user-facing messages. No string literals scattered in handlers. */
export const MESSAGES = Object.freeze({
  AUTH: {
    REGISTERED: 'Registration successful. Please verify your email.',
    LOGGED_IN: 'Logged in successfully.',
    LOGGED_OUT: 'Logged out successfully.',
    TOKEN_REFRESHED: 'Token refreshed successfully.',
    INVALID_CREDENTIALS: 'Invalid email or password.',
    EMAIL_VERIFIED: 'Email verified successfully.',
    PASSWORD_RESET: 'Password has been reset successfully.',
    PASSWORD_CHANGED: 'Password changed successfully.',
    RESET_EMAIL_SENT: 'If the account exists, a reset link has been sent.',
    UNAUTHORIZED: 'Authentication required.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    TOKEN_EXPIRED: 'Session expired. Please log in again.',
    EMAIL_IN_USE: 'Email is already registered.',
  },
  USER: {
    CREATED: 'User created successfully.',
    UPDATED: 'User updated successfully.',
    DELETED: 'User deleted successfully.',
    FETCHED: 'User fetched successfully.',
    NOT_FOUND: 'User not found.',
    LIST_FETCHED: 'Users fetched successfully.',
  },
  COMMON: {
    NOT_FOUND: 'Resource not found.',
    SERVER_ERROR: 'Something went wrong. Please try again later.',
    VALIDATION_FAILED: 'Validation failed.',
    HEALTHY: 'Service is healthy.',
  },
});
