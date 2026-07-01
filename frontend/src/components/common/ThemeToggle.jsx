import { FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '@/hooks/useTheme.js';

export default function ThemeToggle() {
  const { mode, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      {mode === 'dark' ? <FiSun /> : <FiMoon />}
    </button>
  );
}
