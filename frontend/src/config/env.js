/**
 * Frontend runtime config. Vite exposes only VITE_-prefixed vars.
 * Defaults keep local dev working with zero .env setup.
 */
export const config = Object.freeze({
  apiBaseUrl: import.meta.env.VITE_API_URL || '/api/v1',
  appName: import.meta.env.VITE_APP_NAME || 'Nactor',
  isProd: import.meta.env.PROD,
  isDev: import.meta.env.DEV,
});
