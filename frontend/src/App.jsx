import { useEffect } from 'react';
import AppProviders from '@/providers/AppProviders.jsx';
import AppRouter from '@/routes/AppRouter.jsx';
import SessionGate from '@/components/common/SessionGate.jsx';
import { useTheme } from '@/hooks/useTheme.js';

function ThemedApp() {
  // Ensures the <html> theme class is applied on first paint.
  useTheme();
  return (
    <SessionGate>
      <AppRouter />
    </SessionGate>
  );
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add('h-full');
  }, []);
  return (
    <AppProviders>
      <ThemedApp />
    </AppProviders>
  );
}
