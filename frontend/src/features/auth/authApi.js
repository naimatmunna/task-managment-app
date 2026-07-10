import { apiSlice } from '@/api/apiSlice.js';
import { setAccessToken, clearAccessToken } from '@/lib/token.js';
import { setCredentials, clearCredentials } from './authSlice.js';
import { setMemberships, clearOrg } from '@/features/org/orgSlice.js';

/** Shared handler: on a successful auth response, hydrate token + user + orgs. */
const onAuthSuccess = async (_arg, { dispatch, queryFulfilled }) => {
  const { data } = await queryFulfilled;
  const payload = data.data;
  if (payload?.accessToken) {
    setAccessToken(payload.accessToken);
    dispatch(setCredentials(payload.user));
    dispatch(setMemberships(payload.memberships || []));
  }
};

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    signup: builder.mutation({
      query: (body) => ({ url: '/auth/signup', method: 'POST', body }),
    }),
    verifyOtp: builder.mutation({
      query: (body) => ({ url: '/auth/verify-otp', method: 'POST', body }),
      onQueryStarted: onAuthSuccess,
    }),
    verifyLoginOtp: builder.mutation({
      query: (body) => ({ url: '/auth/verify-login-otp', method: 'POST', body }),
      onQueryStarted: onAuthSuccess,
    }),
    resendOtp: builder.mutation({
      query: (body) => ({ url: '/auth/resend-otp', method: 'POST', body }),
    }),
    login: builder.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      onQueryStarted: onAuthSuccess,
    }),
    logout: builder.mutation({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } finally {
          clearAccessToken();
          dispatch(clearCredentials());
          dispatch(clearOrg());
          dispatch(apiSlice.util.resetApiState());
        }
      },
    }),
    me: builder.query({
      query: () => '/auth/me',
      providesTags: ['Auth'],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data.data.user));
          dispatch(setMemberships(data.data.memberships || []));
        } catch {
          dispatch(clearCredentials());
          dispatch(clearOrg());
        }
      },
    }),
    forgotPassword: builder.mutation({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),
    resetPassword: builder.mutation({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),
    changePassword: builder.mutation({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', body }),
    }),
    updateProfile: builder.mutation({
      query: (body) => ({ url: '/auth/me', method: 'PATCH', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCredentials(data.data.user));
      },
      invalidatesTags: ['Auth'],
    }),
    // Step 1: request an email change — emails an OTP to the new address.
    requestEmailChange: builder.mutation({
      query: (body) => ({ url: '/auth/change-email', method: 'POST', body }),
    }),
    // Step 2: confirm with the OTP — swaps the email and re-issues tokens.
    verifyEmailChange: builder.mutation({
      query: (body) => ({ url: '/auth/verify-email-change', method: 'POST', body }),
      onQueryStarted: onAuthSuccess,
      invalidatesTags: ['Auth'],
    }),
  }),
});

export const {
  useSignupMutation,
  useVerifyOtpMutation,
  useVerifyLoginOtpMutation,
  useResendOtpMutation,
  useLoginMutation,
  useLogoutMutation,
  useMeQuery,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
  useUpdateProfileMutation,
  useRequestEmailChangeMutation,
  useVerifyEmailChangeMutation,
} = authApi;
