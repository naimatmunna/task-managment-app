import { cn } from '@/lib/classNames.js';

export default function Spinner({ className, size = 'md' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-4 border-brand-500 border-t-transparent',
        sizes[size],
        className,
      )}
    />
  );
}
