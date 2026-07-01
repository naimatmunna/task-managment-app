import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectTheme, toggleTheme, setTheme } from '@/features/theme/themeSlice.js';

/** Applies the theme class to <html> and exposes toggle/set. */
export const useTheme = () => {
  const mode = useSelector(selectTheme);
  const dispatch = useDispatch();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, [mode]);

  return { mode, toggle: () => dispatch(toggleTheme()), set: (m) => dispatch(setTheme(m)) };
};
