import { createSlice } from '@reduxjs/toolkit';
import { storage } from '@/lib/storage.js';
import { STORAGE_KEYS } from '@/constants';

const stored = storage.get(STORAGE_KEYS.THEME);
const prefersDark =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: stored || (prefersDark ? 'dark' : 'light') },
  reducers: {
    toggleTheme(state) {
      state.mode = state.mode === 'dark' ? 'light' : 'dark';
      storage.set(STORAGE_KEYS.THEME, state.mode);
    },
    setTheme(state, action) {
      state.mode = action.payload;
      storage.set(STORAGE_KEYS.THEME, state.mode);
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export const selectTheme = (s) => s.theme.mode;
export default themeSlice.reducer;
