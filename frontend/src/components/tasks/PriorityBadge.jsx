import { PRIORITY_META } from '@/constants';
import Badge from '@/components/ui/Badge.jsx';

export default function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.medium;
  return (
    <Badge dot className={meta.className}>
      {meta.label}
    </Badge>
  );
}
