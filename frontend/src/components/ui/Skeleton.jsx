import { cn } from '@/lib/classNames.js';

/** Shimmer placeholder (see .skeleton in index.css). */
export default function Skeleton({ className }) {
  return <div className={cn('skeleton rounded-lg', className)} />;
}
