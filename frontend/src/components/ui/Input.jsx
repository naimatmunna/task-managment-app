import { forwardRef } from 'react';
import { cn } from '@/lib/classNames.js';

const Input = forwardRef(function Input({ label, error, className, id, ...props }, ref) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'w-full rounded-lg border px-3 py-2 text-gray-900 shadow-sm transition',
          'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
          'dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700',
          error ? 'border-red-500' : 'border-gray-300',
          className,
        )}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
});

export default Input;
