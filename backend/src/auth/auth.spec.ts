import { RequestOtpSchema, VerifyOtpSchema } from './auth.schemas.js';
import { normalizeIndianMobile } from './phone.js';

describe('normalizeIndianMobile', () => {
  it.each([
    ['9876501234', '+919876501234'],
    ['98765 01234', '+919876501234'],
    ['098765-01234', '+919876501234'],
    ['+91 98765 01234', '+919876501234'],
    ['919876501234', '+919876501234'],
  ])('accepts %s', (input, expected) => {
    expect(normalizeIndianMobile(input)).toBe(expected);
  });

  it.each([
    '12345',
    '5876501234',
    '+1 415 555 0100',
    '98765012345',
    'abcdefghij',
  ])('rejects %s', (input) => {
    expect(normalizeIndianMobile(input)).toBeNull();
  });
});

describe('auth request schemas', () => {
  it('normalises the phone when requesting a code', () => {
    expect(RequestOtpSchema.parse({ phone: '98765 01234' })).toEqual({
      phone: '+919876501234',
    });
  });

  it('rejects unknown fields such as an organizationId', () => {
    expect(
      RequestOtpSchema.safeParse({ phone: '9876501234', organizationId: 'x' })
        .success,
    ).toBe(false);
  });

  it('requires a 6-digit code and a known platform', () => {
    const base = { phone: '9876501234', device: { platform: 'android' } };
    expect(VerifyOtpSchema.safeParse({ ...base, code: '123456' }).success).toBe(
      true,
    );
    expect(VerifyOtpSchema.safeParse({ ...base, code: '12345' }).success).toBe(
      false,
    );
    expect(
      VerifyOtpSchema.safeParse({
        ...base,
        code: '123456',
        device: { platform: 'nokia' },
      }).success,
    ).toBe(false);
  });
});
