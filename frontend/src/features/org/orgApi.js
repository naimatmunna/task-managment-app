import { apiSlice } from '@/api/apiSlice.js';
import { setAccessToken } from '@/lib/token.js';
import { setCredentials } from '@/features/auth/authSlice.js';
import { setMemberships, setActiveOrg } from './orgSlice.js';

export const orgApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    currentOrg: builder.query({
      query: () => '/orgs/current',
      providesTags: ['Org'],
    }),
    updateOrg: builder.mutation({
      query: (body) => ({ url: '/orgs/current', method: 'PATCH', body }),
      invalidatesTags: ['Org'],
      // Refresh memberships so the org switcher/name update everywhere.
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(apiSlice.util.invalidateTags(['Auth']));
      },
    }),
    members: builder.query({
      query: () => '/orgs/members',
      transformResponse: (r) => r.data.members,
      providesTags: ['Member'],
    }),
    inviteMember: builder.mutation({
      query: (body) => ({ url: '/orgs/members/invite', method: 'POST', body }),
      invalidatesTags: ['Member'],
    }),
    updateMemberRole: builder.mutation({
      query: ({ id, role }) => ({ url: `/orgs/members/${id}/role`, method: 'PATCH', body: { role } }),
      invalidatesTags: ['Member'],
    }),
    removeMember: builder.mutation({
      query: (id) => ({ url: `/orgs/members/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Member'],
    }),
    peekInvite: builder.query({
      query: (token) => ({ url: '/orgs/invite', params: { token } }),
      transformResponse: (r) => r.data,
    }),
    acceptInvite: builder.mutation({
      query: (body) => ({ url: '/orgs/invite/accept', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        const payload = data.data;
        setAccessToken(payload.accessToken);
        dispatch(setCredentials(payload.user));
        dispatch(setMemberships(payload.memberships || []));
        // Focus the org they just joined.
        const joined = payload.memberships?.[payload.memberships.length - 1];
        if (joined) dispatch(setActiveOrg(joined.organization.id));
      },
    }),
  }),
});

export const {
  useCurrentOrgQuery,
  useUpdateOrgMutation,
  useMembersQuery,
  useInviteMemberMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
  usePeekInviteQuery,
  useAcceptInviteMutation,
} = orgApi;
