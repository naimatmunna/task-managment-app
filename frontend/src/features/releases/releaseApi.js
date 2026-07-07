import { apiSlice } from '@/api/apiSlice.js';

export const releaseApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    releaseNotes: builder.query({
      query: () => '/release-notes',
      transformResponse: (r) => r.data.releaseNotes,
      providesTags: ['ReleaseNote'],
    }),
    releaseNote: builder.query({
      query: (id) => `/release-notes/${id}`,
      transformResponse: (r) => r.data.releaseNote,
      providesTags: (res, err, id) => [{ type: 'ReleaseNote', id }],
    }),
    createReleaseNote: builder.mutation({
      query: (body) => ({ url: '/release-notes', method: 'POST', body }),
      invalidatesTags: ['ReleaseNote'],
    }),
    updateReleaseNote: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/release-notes/${id}`, method: 'PATCH', body }),
      invalidatesTags: (res, err, { id }) => ['ReleaseNote', { type: 'ReleaseNote', id }],
    }),
    regenerateReleaseNote: builder.mutation({
      query: (id) => ({ url: `/release-notes/${id}/regenerate`, method: 'POST' }),
      invalidatesTags: (res, err, id) => ['ReleaseNote', { type: 'ReleaseNote', id }],
    }),
    deleteReleaseNote: builder.mutation({
      query: (id) => ({ url: `/release-notes/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ReleaseNote'],
    }),
  }),
});

export const {
  useReleaseNotesQuery,
  useReleaseNoteQuery,
  useCreateReleaseNoteMutation,
  useUpdateReleaseNoteMutation,
  useRegenerateReleaseNoteMutation,
  useDeleteReleaseNoteMutation,
} = releaseApi;
