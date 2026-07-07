import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { config } from '@/config/env.js';
import { setAccessToken, clearAccessToken, isAccessTokenValid } from '@/lib/token.js';
import { setAuthenticated, clearCredentials } from '@/features/auth/authSlice.js';
import { clearOrg } from '@/features/org/orgSlice.js';
import Spinner from '@/components/ui/Spinner.jsx';

/**
 * Keeps users signed in for the life of the refresh cookie (7 days). On
 * startup, if there's no valid in-memory access token, it silently exchanges
 * the httpOnly refresh cookie for a fresh access token before the route guards
 * run — so a cleared/expired access token no longer bounces a still-valid
 * session to the login screen.
 */
export default function SessionGate({ children }) {
  const dispatch = useDispatch();
  // A valid token already in hand → no need to block; render immediately.
  const [ready, setReady] = useState(() => isAccessTokenValid());

  useEffect(() => {
    if (ready) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${config.apiBaseUrl}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        const data = res.ok ? await res.json().catch(() => null) : null;
        if (cancelled) return;

        if (data?.data?.accessToken) {
          setAccessToken(data.data.accessToken);
          dispatch(setAuthenticated(true)); // user + orgs hydrate via /me
        } else {
          clearAccessToken();
          dispatch(clearCredentials());
          dispatch(clearOrg());
        }
      } catch {
        // Network error — don't force a logout; guards handle it on next call.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, dispatch]);

  if (!ready) {
    return (
      <div className="bg-app flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  return children;
}
