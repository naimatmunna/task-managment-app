import { apiSlice } from '@/api/apiSlice.js';

/** Serialize a filters object into a query string, dropping empty values. */
const toParams = (filters = {}) => {
  const params = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params[k] = v;
  });
  return params;
};

export const taskApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    board: builder.query({
      query: (filters) => ({ url: '/tasks/board', params: toParams(filters) }),
      transformResponse: (r) => r.data.tasks,
      providesTags: ['Task'],
    }),
    taskList: builder.query({
      query: (filters) => ({ url: '/tasks', params: toParams(filters) }),
      transformResponse: (r) => ({ tasks: r.data.tasks, meta: r.meta }),
      providesTags: ['Task'],
    }),
    task: builder.query({
      query: (id) => `/tasks/${id}`,
      transformResponse: (r) => r.data.task,
      providesTags: (res, err, id) => [{ type: 'Task', id }],
    }),
    createTask: builder.mutation({
      query: (body) => ({ url: '/tasks', method: 'POST', body }),
      invalidatesTags: ['Task'],
    }),
    updateTask: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/tasks/${id}`, method: 'PATCH', body }),
      invalidatesTags: (res, err, { id }) => ['Task', { type: 'Task', id }],
    }),
    // Reorder does NOT invalidate: the board keeps optimistic local order to
    // avoid a refetch (and flicker) on every drag.
    reorderTask: builder.mutation({
      query: ({ id, status, order }) => ({
        url: `/tasks/${id}/reorder`,
        method: 'POST',
        body: { status, order },
      }),
    }),
    commentTask: builder.mutation({
      query: ({ id, message }) => ({ url: `/tasks/${id}/comment`, method: 'POST', body: { message } }),
      invalidatesTags: (res, err, { id }) => [{ type: 'Task', id }],
    }),
    deleteTask: builder.mutation({
      query: (id) => ({ url: `/tasks/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Task'],
    }),
  }),
});

export const {
  useBoardQuery,
  useTaskListQuery,
  useTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useReorderTaskMutation,
  useCommentTaskMutation,
  useDeleteTaskMutation,
} = taskApi;
