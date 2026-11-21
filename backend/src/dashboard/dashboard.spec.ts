import { describe, expect, it } from 'vitest';
import { holdSide } from './dashboard.service.js';

describe('holdSide', () => {
  it('reads the side and reason the sync endpoint saved', () => {
    expect(holdSide('Our side: Tool or gas missing')).toEqual({ side: 'OURS', reason: 'Tool or gas missing' });
    expect(holdSide('Customer side: Customer not at home · call after 5')).toEqual({
      side: 'CUSTOMER',
      reason: 'Customer not at home · call after 5',
    });
  });

  it('handles a side without a reason, a reason without a side, and no note', () => {
    expect(holdSide('Customer side')).toEqual({ side: 'CUSTOMER', reason: null });
    expect(holdSide('Rain')).toEqual({ side: null, reason: 'Rain' });
    expect(holdSide(null)).toEqual({ side: null, reason: null });
  });
});
