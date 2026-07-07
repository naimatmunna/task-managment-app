/**
 * Frontend runtime config. Vite exposes only VITE_-prefixed vars.
 * Defaults keep local dev working with zero .env setup.
 */
export const config = Object.freeze({
  apiBaseUrl: import.meta.env.VITE_API_URL || '/api/v1',
  appName: import.meta.env.VITE_APP_NAME || 'Nactor',
  proxyBaseUrl: import.meta.env.VITE_PROXY_BASE_URL || 'http://localhost:4040',
  appDescription: import.meta.env.VITE_APP_DESCRIPTION || 'Nuvora is a task management tool that helps you manage your tasks and projects.',
  isProd: import.meta.env.PROD,
  isDev: import.meta.env.DEV,
});
