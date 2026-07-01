import { createSlice } from '@reduxjs/toolkit';
import { getAccessToken } from '@/lib/token.js';

const initialState = {
  user: null,
  isAuthenticated: Boolean(getAccessToken()),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearCredentials(state) {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export const selectCurrentUser = (s) => s.auth.user;
export const selectIsAuthenticated = (s) => s.auth.isAuthenticated;
export const selectUserRoles = (s) => s.auth.user?.roles ?? [];
export default authSlice.reducer;
