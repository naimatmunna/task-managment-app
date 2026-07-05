import { createSlice } from '@reduxjs/toolkit';
import { storage } from '@/lib/storage.js';
import { STORAGE_KEYS } from '@/constants';

/**
 * Holds the caller's org memberships and which org is currently active. The
 * active org id is mirrored to localStorage and injected as `x-org-id` on every
 * API request (see api/baseQuery.js) — it is the client half of multi-tenancy.
 */
const storedActive = storage.get(STORAGE_KEYS.ACTIVE_ORG) || null;

const pickActive = (memberships, preferred) => {
  if (!memberships?.length) return null;
  const found = memberships.find((m) => m.organization.id === preferred);
  return (found || memberships[0]).organization.id;
};

const initialState = {
  memberships: [],
  activeOrgId: storedActive,
};

const orgSlice = createSlice({
  name: 'org',
  initialState,
  reducers: {
    setMemberships(state, action) {
      state.memberships = action.payload || [];
      const next = pickActive(state.memberships, state.activeOrgId);
      state.activeOrgId = next;
      if (next) storage.set(STORAGE_KEYS.ACTIVE_ORG, next);
      else storage.remove(STORAGE_KEYS.ACTIVE_ORG);
    },
    setActiveOrg(state, action) {
      state.activeOrgId = action.payload;
      storage.set(STORAGE_KEYS.ACTIVE_ORG, action.payload);
    },
    clearOrg(state) {
      state.memberships = [];
      state.activeOrgId = null;
      storage.remove(STORAGE_KEYS.ACTIVE_ORG);
    },
  },
});

export const { setMemberships, setActiveOrg, clearOrg } = orgSlice.actions;

export const selectMemberships = (s) => s.org.memberships;
export const selectActiveOrgId = (s) => s.org.activeOrgId;
export const selectActiveMembership = (s) =>
  s.org.memberships.find((m) => m.organization.id === s.org.activeOrgId) || null;
export const selectActiveOrg = (s) => selectActiveMembership(s)?.organization || null;
export const selectActiveRole = (s) => selectActiveMembership(s)?.role || null;

export default orgSlice.reducer;
