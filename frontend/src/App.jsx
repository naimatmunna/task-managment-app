import { useEffect } from 'react';
import AppProviders from '@/providers/AppProviders.jsx';
import AppRouter from '@/routes/AppRouter.jsx';
import { useTheme } from '@/hooks/useTheme.js';

function ThemedApp() {
  // Ensures the <html> theme class is applied on first paint.
  useTheme();
  return <AppRouter />;
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
