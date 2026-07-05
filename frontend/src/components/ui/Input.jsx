import { forwardRef } from 'react';
import { cn } from '@/lib/classNames.js';

const Input = forwardRef(function Input({ label, error, className, id, ...props }, ref) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'h-10 w-full rounded-xl border bg-white px-3.5 text-gray-900 shadow-xs transition-colors duration-150',
          'placeholder:text-gray-400 focus:border-brand-500 focus:outline-none',
          'dark:bg-gray-800/80 dark:text-gray-100 dark:placeholder:text-gray-500',
          error
            ? 'border-danger-400 focus:border-danger-500'
            : 'border-gray-200 dark:border-white/10',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-danger-600">{error}</p>}
    </div>
  );
});

export default Input;
