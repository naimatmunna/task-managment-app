import { cn } from '@/lib/classNames.js';

/** Friendly empty placeholder with optional icon and action. */
export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}>
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 shadow-soft ring-1 ring-inset ring-brand-100 dark:from-brand-500/10 dark:to-brand-500/20 dark:text-brand-300 dark:ring-brand-500/20">
          <Icon className="h-7 w-7" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
