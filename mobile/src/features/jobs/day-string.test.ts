import { dayString } from './jobs';

jest.mock('expo-router', () => ({ router: {}, Stack: { Screen: () => null }, useLocalSearchParams: () => ({}) }));

describe('dayString (Today / Tomorrow chips)', () => {
  it('gives local calendar dates, rolling over months and years', () => {
    const base = new Date(2026, 10, 30, 23, 30); // 30 Nov 2026, late evening
    expect(dayString(0, base)).toBe('2026-11-30');
    expect(dayString(1, base)).toBe('2026-12-01');
    expect(dayString(32, base)).toBe('2027-01-01');
  });
});
