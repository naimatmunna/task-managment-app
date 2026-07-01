import { Provider } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import { store } from '@/store/index.js';
import ErrorBoundary from '@/components/common/ErrorBoundary.jsx';

/** Single wrapper composing every app-wide provider. */
export default function AppProviders({ children }) {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <HelmetProvider>
          {children}
          <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        </HelmetProvider>
      </Provider>
    </ErrorBoundary>
  );
}
