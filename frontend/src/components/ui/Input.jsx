import { forwardRef } from 'react';
import { cn } from '@/lib/classNames.js';

/**
 * Text input with an optional label, error, leading icon and trailing slot.
 * `icon` renders a lucide icon component on the left; `rightSlot` holds an
 * interactive adornment (e.g. a password show/hide toggle).
 */
const Input = forwardRef(function Input(
  { label, error, className, id, icon: Icon, rightSlot, ...props },
  ref,
) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            className="pointer-events-none absolute left-3.5 top-1/2 h-[1.05rem] w-[1.05rem] -translate-y-1/2 text-gray-400 dark:text-gray-500"
            strokeWidth={2}
            aria-hidden="true"
          />
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'h-10 w-full rounded-xl border bg-white px-3.5 text-gray-900 shadow-xs transition duration-150',
            'placeholder:text-gray-400 focus:outline-none focus:ring-4',
            'dark:bg-gray-800/80 dark:text-gray-100 dark:placeholder:text-gray-500',
            Icon && 'pl-10',
            rightSlot && 'pr-11',
            error
              ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-500/10'
              : 'border-gray-200 focus:border-brand-500 focus:ring-brand-500/12 dark:border-white/10',
            className,
          )}
          {...props}
        />
        {rightSlot && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-danger-600">{error}</p>}
    </div>
  );
});

export default Input;
