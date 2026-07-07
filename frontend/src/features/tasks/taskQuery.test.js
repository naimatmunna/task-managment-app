import { describe, it, expect } from 'vitest';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import { toApiFilters } from './taskQuery.js';

const ymd = (d) => format(d, 'yyyy-MM-dd');
const WEEK = { weekStartsOn: 1 };

describe('toApiFilters — due-date translation', () => {
  it('passes non-date filters through and strips raw due keys', () => {
    const api = toApiFilters({ status: 'todo', page: '2', sort: '-createdAt' });
    expect(api).toEqual({ status: 'todo', page: '2', sort: '-createdAt' });
  });

  it('overdue → flag only, with no explicit bounds', () => {
    expect(toApiFilters({ due: 'overdue', status: 'todo' })).toEqual({ status: 'todo', overdue: 'true' });
  });

  it('today → UTC start/end of the local calendar day', () => {
    const api = toApiFilters({ due: 'today' });
    const today = ymd(new Date());
    expect(api.dueAfter).toBe(`${today}T00:00:00.000Z`);
    expect(api.dueBefore).toBe(`${today}T23:59:59.999Z`);
  });

  it('custom → exact UTC day bounds from yyyy-MM-dd inputs (timezone-independent)', () => {
    const api = toApiFilters({ due: 'custom', dueAfter: '2026-03-05', dueBefore: '2026-03-20' });
    expect(api.dueAfter).toBe('2026-03-05T00:00:00.000Z');
    expect(api.dueBefore).toBe('2026-03-20T23:59:59.999Z');
  });

  it('custom → supports a single open-ended bound', () => {
    expect(toApiFilters({ due: 'custom', dueAfter: '2026-03-05' })).toEqual({
      dueAfter: '2026-03-05T00:00:00.000Z',
    });
    expect(toApiFilters({ due: 'custom', dueBefore: '2026-03-20' })).toEqual({
      dueBefore: '2026-03-20T23:59:59.999Z',
    });
  });

  it('week → Monday..Sunday UTC bounds', () => {
    const now = new Date();
    const api = toApiFilters({ due: 'week' });
    expect(api.dueAfter).toBe(`${ymd(startOfWeek(now, WEEK))}T00:00:00.000Z`);
    expect(api.dueBefore).toBe(`${ymd(endOfWeek(now, WEEK))}T23:59:59.999Z`);
  });

  it('month → first..last day UTC bounds', () => {
    const now = new Date();
    const api = toApiFilters({ due: 'month' });
    expect(api.dueAfter).toBe(`${ymd(startOfMonth(now))}T00:00:00.000Z`);
    expect(api.dueBefore).toBe(`${ymd(endOfMonth(now))}T23:59:59.999Z`);
  });
});
