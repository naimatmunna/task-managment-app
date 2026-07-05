import { cn } from '@/lib/classNames.js';

/** Surface container with the app's soft border + shadow language. */
export default function Card({ children, className, as: Tag = 'div', ...props }) {
  return (
    <Tag
      className={cn(
        'rounded-2xl border border-gray-200/70 bg-white shadow-soft dark:border-white/10 dark:bg-gray-900',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
