import { cn } from '@/lib/classNames.js';

/** Deterministic gradient from a string so a user's colour is stable. */
const COLORS = [
  'from-rose-400 to-rose-600',
  'from-orange-400 to-orange-600',
  'from-amber-400 to-amber-600',
  'from-emerald-400 to-emerald-600',
  'from-teal-400 to-teal-600',
  'from-sky-400 to-sky-600',
  'from-brand-400 to-brand-600',
  'from-violet-400 to-violet-600',
  'from-fuchsia-400 to-fuchsia-600',
];

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

const colorFor = (key = '') => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
};

const SIZES = { xs: 'h-6 w-6 text-[10px]', sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };

export default function Avatar({ name, src, size = 'md', className, title }) {
  return (
    <span
      title={title || name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white shadow-xs ring-2 ring-white dark:ring-gray-900',
        !src && `bg-gradient-to-br ${colorFor(name)}`,
        SIZES[size],
        className,
      )}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
