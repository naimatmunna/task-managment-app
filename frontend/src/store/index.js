import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { apiSlice } from '@/api/apiSlice.js';
import authReducer from '@/features/auth/authSlice.js';
import orgReducer from '@/features/org/orgSlice.js';
import themeReducer from '@/features/theme/themeSlice.js';

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    auth: authReducer,
    org: orgReducer,
    theme: themeReducer,
  },
  middleware: (getDefault) => getDefault().concat(apiSlice.middleware),
  devTools: import.meta.env.DEV,
});

setupListeners(store.dispatch);
