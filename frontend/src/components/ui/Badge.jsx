import { cn } from '@/lib/classNames.js';

/**
 * Small pill for statuses, priorities, labels. Structural only — the colour
 * (and any frosted `badge-glass`) is supplied by the caller via `className`,
 * so a bare Badge inherits whatever tint it's given rather than a flat grey.
 */
export default function Badge({ children, className, dot = false }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}
