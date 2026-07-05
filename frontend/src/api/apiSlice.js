import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQuery.js';

/**
 * Root API service. Feature APIs extend this via injectEndpoints, so the
 * whole app shares one cache, one middleware, and one set of tag types.
 */
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth', 'Org', 'Member', 'Team', 'Task', 'Notification', 'Report'],
  endpoints: () => ({}),
});
