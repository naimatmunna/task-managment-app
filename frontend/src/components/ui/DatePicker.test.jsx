import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import DatePicker from './DatePicker.jsx';

/** Controlled wrapper so the trigger reflects committed values. */
function Harness({ initial = '', onChange, ...rest }) {
  const [value, setValue] = useState(initial);
  return (
    <DatePicker
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      {...rest}
    />
  );
}

describe('DatePicker', () => {
  it('opens, selects a day, and emits a yyyy-MM-dd string', () => {
    const seen = [];
    render(<Harness initial="2026-07-15" onChange={(v) => seen.push(v)} placeholder="Pick" />);

    // Trigger shows the formatted current value.
    const trigger = screen.getByRole('button', { name: /jul 15, 2026/i });
    fireEvent.click(trigger);

    // Popover calendar appears with July 2026.
    const dialog = screen.getByRole('dialog', { name: /choose a date/i });
    expect(within(dialog).getByText('July 2026')).toBeInTheDocument();

    // Pick the 20th.
    fireEvent.click(within(dialog).getByRole('button', { name: /monday, july 20, 2026/i }));

    expect(seen.at(-1)).toBe('2026-07-20');
  });

  it('clears the value', () => {
    const seen = [];
    render(<Harness initial="2026-07-15" onChange={(v) => seen.push(v)} />);
    fireEvent.click(screen.getByRole('button', { name: /clear date/i }));
    expect(seen.at(-1)).toBe('');
  });

  it('disables days outside the min/max bounds', () => {
    render(<Harness initial="2026-07-15" min="2026-07-10" max="2026-07-20" />);
    fireEvent.click(screen.getByRole('button', { name: /jul 15, 2026/i }));
    const dialog = screen.getByRole('dialog', { name: /choose a date/i });
    expect(within(dialog).getByRole('button', { name: /july 5, 2026/i })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: /july 25, 2026/i })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: /july 15, 2026/i })).not.toBeDisabled();
  });
});
