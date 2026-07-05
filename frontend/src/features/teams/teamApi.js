import { apiSlice } from '@/api/apiSlice.js';

export const teamApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    teams: builder.query({
      query: () => '/teams',
      transformResponse: (r) => r.data.teams,
      providesTags: ['Team'],
    }),
    createTeam: builder.mutation({
      query: (body) => ({ url: '/teams', method: 'POST', body }),
      invalidatesTags: ['Team'],
    }),
    updateTeam: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/teams/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Team'],
    }),
    deleteTeam: builder.mutation({
      query: (id) => ({ url: `/teams/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Team', 'Task'],
    }),
  }),
});

export const {
  useTeamsQuery,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
} = teamApi;
