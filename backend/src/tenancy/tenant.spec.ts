import type { AuthContext } from '../auth/token.service.js';
import { AppError } from '../common/app-error.js';
import { requireOrg, scoped } from './tenant.js';

const member: AuthContext = {
  userId: 'u1',
  deviceId: 'd1',
  organizationId: 'org-a',
  memberId: 'm1',
  role: 'OWNER',
};
const noOrg: AuthContext = {
  ...member,
  organizationId: null,
  memberId: null,
  role: null,
};

describe('tenant scoping', () => {
  it('adds the caller organization to a where clause', () => {
    expect(scoped(member, { id: 'x' })).toEqual({
      id: 'x',
      organizationId: 'org-a',
    });
  });

  it('never trusts an organizationId passed in by the caller', () => {
    expect(scoped(member, { organizationId: 'org-b' }).organizationId).toBe(
      'org-a',
    );
  });

  it('refuses callers without a business', () => {
    expect(() => requireOrg(noOrg)).toThrow(AppError);
    try {
      scoped(noOrg, {});
    } catch (e) {
      expect((e as AppError).code).toBe('NO_ORGANIZATION');
    }
  });
});
