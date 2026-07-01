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
