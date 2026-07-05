import { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Check, ChevronsUpDown } from 'lucide-react';
import { setActiveOrg } from '@/features/org/orgSlice.js';
import { useOrg } from '@/hooks/useOrg.js';
import { cn } from '@/lib/classNames.js';

/** Dropdown to switch the active organization. Persists via orgSlice → x-org-id. */
export default function OrgSwitcher() {
  const dispatch = useDispatch();
  const { memberships, org } = useOrg();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!org) return null;
  const multiple = memberships.length > 1;

  const initial = org.name?.[0]?.toUpperCase() || 'O';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => multiple && setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-xl border border-gray-200/70 bg-white px-2.5 py-2 text-left shadow-xs transition-all duration-150 ease-smooth dark:border-white/10 dark:bg-gray-800/50',
          multiple ? 'hover:border-gray-300 hover:shadow-soft dark:hover:bg-gray-800' : 'cursor-default',
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {org.name}
          </span>
          <span className="block truncate text-xs text-gray-400">{org.slug}</span>
        </span>
        {multiple && <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-400" />}
      </button>

      {open && multiple && (
        <div className="absolute left-0 right-0 z-30 mt-1 origin-top animate-scale-in overflow-hidden rounded-xl border border-gray-200/70 bg-white py-1 shadow-pop dark:border-white/10 dark:bg-gray-800">
          {memberships.map((m) => (
            <button
              key={m.organization.id}
              type="button"
              onClick={() => {
                dispatch(setActiveOrg(m.organization.id));
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <span className="flex-1 truncate">{m.organization.name}</span>
              <span className="text-xs capitalize text-gray-400">{m.role}</span>
              {m.organization.id === org.id && <Check className="h-4 w-4 text-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
