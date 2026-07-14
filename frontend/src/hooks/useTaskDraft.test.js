import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskDraft } from './useTaskDraft.js';

beforeEach(() => sessionStorage.clear());

describe('useTaskDraft', () => {
  it('debounces saves, then restores them', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTaskDraft({ userId: 'u1', orgId: 'o1' }));
    act(() => result.current.save({ title: 'Hello' }));
    // Nothing written until the debounce elapses.
    expect(sessionStorage.getItem('task-draft:v1:u1:o1:create')).toBeNull();
    act(() => vi.advanceTimersByTime(600));
    expect(result.current.restore()).toEqual({ title: 'Hello' });
    vi.useRealTimers();
  });

  it('isolates drafts by user and by org', () => {
    vi.useFakeTimers();
    const a = renderHook(() => useTaskDraft({ userId: 'u1', orgId: 'o1' }));
    act(() => a.result.current.save({ title: 'A' }));
    act(() => vi.advanceTimersByTime(600));

    const otherUser = renderHook(() => useTaskDraft({ userId: 'u2', orgId: 'o1' }));
    const otherOrg = renderHook(() => useTaskDraft({ userId: 'u1', orgId: 'o2' }));
    expect(otherUser.result.current.restore()).toBeNull();
    expect(otherOrg.result.current.restore()).toBeNull();
    vi.useRealTimers();
  });

  it('clears the draft', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTaskDraft({ userId: 'u1', orgId: 'o1' }));
    act(() => result.current.save({ title: 'X' }));
    act(() => vi.advanceTimersByTime(600));
    act(() => result.current.clear());
    expect(result.current.restore()).toBeNull();
    vi.useRealTimers();
  });

  it('safely ignores corrupt or wrong-version stored data', () => {
    sessionStorage.setItem('task-draft:v1:u1:o1:create', '{ not json');
    const corrupt = renderHook(() => useTaskDraft({ userId: 'u1', orgId: 'o1' }));
    expect(corrupt.result.current.restore()).toBeNull();

    sessionStorage.setItem('task-draft:v1:u1:o1:create', JSON.stringify({ v: 99, values: { title: 'old' } }));
    const staleSchema = renderHook(() => useTaskDraft({ userId: 'u1', orgId: 'o1' }));
    expect(staleSchema.result.current.restore()).toBeNull();
  });

  it('is a no-op without user/org', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTaskDraft({ userId: null, orgId: null }));
    act(() => result.current.save({ title: 'Y' }));
    act(() => vi.advanceTimersByTime(600));
    expect(result.current.restore()).toBeNull();
    vi.useRealTimers();
  });
});
