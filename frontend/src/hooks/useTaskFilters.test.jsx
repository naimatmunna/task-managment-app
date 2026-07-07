import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useTaskFilters } from './useTaskFilters.js';

const wrapper = (initial) =>
  function Wrapper({ children }) {
    return <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>;
  };

describe('useTaskFilters', () => {
  it('applies a due preset atomically when leaving a custom range (regression)', () => {
    // Reproduces the bug where selecting "Due today" did nothing: three separate
    // setFilter calls clobbered each other and the due value was dropped.
    const { result } = renderHook(() => useTaskFilters(), {
      wrapper: wrapper('/?due=custom&dueAfter=2026-03-01&dueBefore=2026-03-31'),
    });
    expect(result.current.filters.due).toBe('custom');

    act(() => {
      result.current.setFilters({ due: 'today', dueAfter: '', dueBefore: '' });
    });

    expect(result.current.filters).toEqual({ due: 'today' });
  });

  it('setFilters clears keys given empty values and keeps the rest', () => {
    const { result } = renderHook(() => useTaskFilters(), {
      wrapper: wrapper('/?status=todo&priority=high&due=week'),
    });
    act(() => result.current.setFilters({ due: 'month', priority: '' }));
    expect(result.current.filters).toEqual({ status: 'todo', due: 'month' });
  });

  it('a non-page filter change resets pagination', () => {
    const { result } = renderHook(() => useTaskFilters(), {
      wrapper: wrapper('/?status=todo&page=3'),
    });
    act(() => result.current.setFilter('priority', 'high'));
    expect(result.current.filters.page).toBeUndefined();
    expect(result.current.filters).toEqual({ status: 'todo', priority: 'high' });
  });

  it('changing the page keeps existing filters intact', () => {
    const { result } = renderHook(() => useTaskFilters(), {
      wrapper: wrapper('/?status=todo'),
    });
    act(() => result.current.setFilter('page', '2'));
    expect(result.current.filters).toEqual({ status: 'todo', page: '2' });
  });
});
