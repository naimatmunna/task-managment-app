import { cn } from '@/lib/classNames.js';

/**
 * Standardized icon-only button. Wraps a lucide (SVG, currentColor) glyph in a
 * button with a comfortable touch target, consistent radius/hover/focus, and a
 * required accessible name (`label` → aria-label + tooltip). The icon itself is
 * marked decorative since the button carries the name.
 *
 * Sizes keep the interactive target ≥ 32px while the glyph stays crisp at any
 * DPI (SVG scales without distortion — no fixed-ratio stretching).
 */
const SIZES = {
  sm: { btn: 'h-8 w-8', icon: 'h-4 w-4' }, // 32px target · 16px glyph — table actions
  md: { btn: 'h-9 w-9', icon: 'h-[18px] w-[18px]' }, // 36px · 18px — standard
  lg: { btn: 'h-10 w-10', icon: 'h-5 w-5' }, // 40px · 20px — primary
};

const VARIANTS = {
  default:
    'text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200',
  primary:
    'text-brand-600 hover:bg-brand-50 hover:text-brand-700 dark:text-brand-400 dark:hover:bg-brand-500/15',
  danger:
    'text-gray-400 hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-900/20',
};

export default function IconButton({
  icon: Icon,
  label,
  size = 'sm',
  variant = 'default',
  className,
  disabled,
  ...props
}) {
  const s = SIZES[size] || SIZES.sm;
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50',
        'disabled:cursor-not-allowed disabled:opacity-40',
        s.btn,
        VARIANTS[variant] || VARIANTS.default,
        className,
      )}
      {...props}
    >
      <Icon className={s.icon} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
