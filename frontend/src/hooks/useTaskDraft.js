import { useCallback, useEffect, useRef } from 'react';

/**
 * Temporary autosave for the *create-task* form so accidental closes / refreshes
 * don't lose typed work. (The edit flow persists every field on blur, so it has
 * no unsaved state to protect.)
 *
 * Strategy — sessionStorage:
 *   • survives a page refresh but not a browser restart (a "temporary" draft);
 *   • no binaries are stored (the create form has no attachments);
 *   • the payload is small primitives only.
 *
 * Keys are scoped by user + org and versioned so a schema change can't crash on
 * stale data:  `task-draft:v1:{userId}:{orgId}:create`
 */
const VERSION = 1;
const DEBOUNCE_MS = 500;

const canUseStorage = () => {
  try {
    const k = '__t__';
    sessionStorage.setItem(k, '1');
    sessionStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
};

export function useTaskDraft({ userId, orgId, enabled = true }) {
  const key = userId && orgId ? `task-draft:v${VERSION}:${userId}:${orgId}:create` : null;
  const timer = useRef(null);
  const available = useRef(canUseStorage());

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!key || !available.current) return;
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* storage unavailable — nothing to clean up */
    }
  }, [key]);

  /** Read + validate a stored draft. Returns the values object or null. */
  const restore = useCallback(() => {
    if (!enabled || !key || !available.current) return null;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Reject anything that isn't our current schema shape.
      if (!parsed || parsed.v !== VERSION || typeof parsed.values !== 'object') {
        sessionStorage.removeItem(key);
        return null;
      }
      return parsed.values;
    } catch {
      // Corrupt JSON — drop it so it can't recur.
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      return null;
    }
  }, [enabled, key]);

  /** Debounced write; never throws, never blocks typing. */
  const save = useCallback(
    (values) => {
      if (!enabled || !key || !available.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        try {
          sessionStorage.setItem(key, JSON.stringify({ v: VERSION, savedAt: Date.now(), values }));
        } catch {
          /* quota / private mode — degrade silently */
        }
      }, DEBOUNCE_MS);
    },
    [enabled, key],
  );

  // Flush any pending debounce on unmount so a fast close still persists.
  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  return { restore, save, clear };
}
