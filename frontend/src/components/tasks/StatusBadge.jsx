import { STATUS_META } from '@/constants';
import Badge from '@/components/ui/Badge.jsx';

/** Frosted, per-status badge (no more flat grey). */
export default function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  if (!meta) return null;
  return (
    <Badge dot className={meta.chip}>
      {meta.label}
    </Badge>
  );
}
