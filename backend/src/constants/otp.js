/** Why an OTP was issued. Scopes verification so a signup code can't reset a password. */
export const OTP_PURPOSE = Object.freeze({
  SIGNUP: 'signup',
  LOGIN: 'login',
  RESET: 'reset',
  EMAIL_CHANGE: 'email_change',
});

export const OTP_PURPOSE_VALUES = Object.freeze(Object.values(OTP_PURPOSE));
