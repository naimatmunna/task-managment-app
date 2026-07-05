import { forwardRef } from 'react';
import { cn } from '@/lib/classNames.js';

const Select = forwardRef(function Select({ label, error, className, id, children, ...props }, ref) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={cn(
          'select-field h-10 w-full rounded-xl border bg-white px-3.5 pr-9 text-gray-900 shadow-xs transition-colors duration-150',
          'focus:border-brand-500 focus:outline-none',
          'dark:bg-gray-800/80 dark:text-gray-100',
          error ? 'border-danger-400' : 'border-gray-200 dark:border-white/10',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1.5 text-sm text-danger-600">{error}</p>}
    </div>
  );
});

export default Select;
