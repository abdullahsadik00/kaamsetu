import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor, newestFirst } from './updates.js';

describe('updates feed cursor', () => {
  it('round-trips time and id', () => {
    const at = new Date('2026-11-22T06:35:01.123Z');
    const id = '0b7f1c9e-4a52-4c1e-9d43-1d2b9b0c7a11';
    expect(decodeCursor(encodeCursor(at, id))).toEqual({ at, id });
  });

  it('refuses anything else', () => {
    expect(decodeCursor('2026-11-22')).toBeNull();
    expect(decodeCursor('x_0b7f1c9e-4a52-4c1e-9d43-1d2b9b0c7a11')).toBeNull();
  });

  it('orders newest first, then by id (stable across pages)', () => {
    const t = (h: number) => new Date(Date.UTC(2026, 10, 22, h));
    const rows = [
      { id: 'a', at: t(1) },
      { id: 'c', at: t(2) },
      { id: 'b', at: t(2) },
    ];
    expect([...rows].sort(newestFirst).map((r) => r.id)).toEqual(['c', 'b', 'a']);
  });
});
