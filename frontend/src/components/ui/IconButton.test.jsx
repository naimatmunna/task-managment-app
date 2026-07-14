import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Trash2 } from 'lucide-react';
import IconButton from './IconButton.jsx';

describe('IconButton', () => {
  it('exposes an accessible name + tooltip and is a real button', () => {
    render(<IconButton icon={Trash2} label="Delete release" />);
    const btn = screen.getByRole('button', { name: 'Delete release' });
    expect(btn).toHaveAttribute('title', 'Delete release');
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('renders a scalable SVG glyph (not a raster image) and hides it from AT', () => {
    render(<IconButton icon={Trash2} label="X" />);
    const svg = screen.getByRole('button', { name: 'X' }).querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('supports a disabled state', () => {
    render(<IconButton icon={Trash2} label="Disabled" disabled />);
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled();
  });
});
