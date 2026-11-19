import { inviteTokenFrom } from './session';

const TOKEN = 'AbC123_-xyzAbC123_-xyzAbC123_-xy'; // 32 chars, base64url like the backend's

describe('inviteTokenFrom (owner QR, D-025)', () => {
  it('reads the token from the QR link', () => {
    expect(inviteTokenFrom(`kaamsetu://join?t=${TOKEN}`)).toBe(TOKEN);
    expect(inviteTokenFrom(`  kaamsetu://join?x=1&t=${TOKEN}\n`)).toBe(TOKEN);
  });

  it('accepts a bare token', () => {
    expect(inviteTokenFrom(TOKEN)).toBe(TOKEN);
  });

  it('rejects other QR codes', () => {
    expect(inviteTokenFrom('https://example.com/?t=' + TOKEN)).toBeNull();
    expect(inviteTokenFrom('upi://pay?pa=someone@bank')).toBeNull();
    expect(inviteTokenFrom('123456')).toBeNull();
    expect(inviteTokenFrom('kaamsetu://join?t=short')).toBeNull();
  });
});
