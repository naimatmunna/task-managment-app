import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { config } from '@/config/env.js';
import { getAccessToken, setAccessToken, clearAccessToken } from '@/lib/token.js';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: config.apiBaseUrl,
  credentials: 'include', // send refresh cookie
  prepareHeaders: (headers) => {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

// Ensures only one refresh request is in-flight; concurrent 401s await it.
let refreshPromise = null;

/**
 * Wraps the base query with transparent access-token refresh:
 * on a 401, it hits /auth/refresh (using the httpOnly cookie), stores the new
 * access token, and retries the original request exactly once.
 */
export const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401 && !args?._retry) {
    if (!refreshPromise) {
      refreshPromise = rawBaseQuery(
        { url: '/auth/refresh', method: 'POST' },
        api,
        extraOptions,
      ).finally(() => {
        refreshPromise = null;
      });
    }

    const refreshResult = await refreshPromise;

    if (refreshResult.data?.data?.accessToken) {
      setAccessToken(refreshResult.data.data.accessToken);
      result = await rawBaseQuery(
        { ...(typeof args === 'string' ? { url: args } : args), _retry: true },
        api,
        extraOptions,
      );
    } else {
      clearAccessToken();
    }
  }

  return result;
};
