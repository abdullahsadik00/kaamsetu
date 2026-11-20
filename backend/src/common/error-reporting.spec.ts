import type { ErrorEvent } from '@sentry/node';
import { scrubEvent } from './error-reporting.js';

describe('scrubEvent (no personal data to Sentry)', () => {
  it('keeps method and path only, drops body, headers, cookies, query, user', () => {
    const event = {
      type: undefined,
      request: {
        method: 'POST',
        url: 'https://api.example/api/v1/auth/accept-invite?phone=+919876501234',
        data: { phone: '+919876501234', code: '123456' },
        headers: { authorization: 'Bearer secret' },
        cookies: { a: 'b' },
        query_string: 'phone=+919876501234',
      },
      user: { id: 'u1', email: 'x@example.com', ip_address: '1.2.3.4' },
      extra: { body: 'secret' },
      breadcrumbs: [
        { category: 'http', data: { url: 'https://x/api?token=abc', method: 'GET', status_code: 200 } },
        { category: 'console', message: 'OTP for ****1234 is 482913' },
      ],
    } as unknown as ErrorEvent;

    const out = scrubEvent(event);
    expect(out.request).toEqual({ method: 'POST', url: 'https://api.example/api/v1/auth/accept-invite' });
    expect(out.user).toBeUndefined();
    expect(out.extra).toBeUndefined();
    expect(out.breadcrumbs?.[0].data).toEqual({ url: 'https://x/api', method: 'GET' });
    expect(out.breadcrumbs?.[1].message).toBeUndefined();
    expect(JSON.stringify(out)).not.toMatch(/9876501234|123456|secret|482913|abc/);
  });
});
