import { apiSlice } from '@/api/apiSlice.js';

export const notificationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    notifications: builder.query({
      query: () => '/notifications',
      transformResponse: (r) => r.data, // { notifications, unread }
      providesTags: ['Notification'],
    }),
    markNotificationRead: builder.mutation({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'POST' }),
      invalidatesTags: ['Notification'],
    }),
    markAllNotificationsRead: builder.mutation({
      query: () => ({ url: '/notifications/read-all', method: 'POST' }),
      invalidatesTags: ['Notification'],
    }),
  }),
});

export const {
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationApi;
