import { storage } from './storage.js';
import { STORAGE_KEYS } from '@/constants';

/**
 * Access token lives in memory first (module scope) with a localStorage
 * mirror so a page refresh restores the session until refresh runs.
 */
let accessToken = storage.get(STORAGE_KEYS.ACCESS_TOKEN);

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token;
  storage.set(STORAGE_KEYS.ACCESS_TOKEN, token);
};

export const clearAccessToken = () => {
  accessToken = null;
  storage.remove(STORAGE_KEYS.ACCESS_TOKEN);
};

/** True when a non-expired access token is held (5s clock-skew buffer). */
export const isAccessTokenValid = () => {
  if (!accessToken) return false;
  try {
    const [, payload] = accessToken.split('.');
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.exp === 'number' && json.exp * 1000 > Date.now() + 5000;
  } catch {
    return false;
  }
};
