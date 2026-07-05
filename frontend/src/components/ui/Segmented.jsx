import { cn } from '@/lib/classNames.js';

/**
 * A compact segmented control (iOS-style). Options: [{ value, label, icon? }].
 * Purely presentational — the parent owns the selected value.
 */
export default function Segmented({ value, onChange, options, size = 'md', className }) {
  const pad = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl border border-gray-200/80 bg-gray-100/70 p-1 dark:border-white/10 dark:bg-gray-800/60',
        className,
      )}
      role="tablist"
    >
      {options.map((o) => {
        const active = value === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg font-medium transition-all duration-150 ease-smooth',
              pad,
              active
                ? 'bg-white text-gray-900 shadow-xs ring-1 ring-black/[0.03] dark:bg-gray-700 dark:text-white dark:ring-white/10'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
