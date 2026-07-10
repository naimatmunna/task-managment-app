import { createSlice } from '@reduxjs/toolkit';

/** Online member ids per organization, fed by the realtime `presence:update` event. */
const presenceSlice = createSlice({
  name: 'presence',
  initialState: { onlineByOrg: {} },
  reducers: {
    setOnline(state, action) {
      const { orgId, online } = action.payload;
      if (orgId) state.onlineByOrg[orgId] = online || [];
    },
    clearPresence(state) {
      state.onlineByOrg = {};
    },
  },
});

export const { setOnline, clearPresence } = presenceSlice.actions;

/** Selector factory: online user ids for a given org (stable empty array). */
const EMPTY = [];
export const selectOnlineIds = (orgId) => (s) => s.presence.onlineByOrg[orgId] || EMPTY;

export default presenceSlice.reducer;
