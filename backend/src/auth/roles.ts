import { SetMetadata } from '@nestjs/common';

export type Role = 'OWNER' | 'SENIOR_TECHNICIAN' | 'HELPER';

export const ALL_ROLES: readonly Role[] = [
  'OWNER',
  'SENIOR_TECHNICIAN',
  'HELPER',
];

export const ROLES_KEY = 'kaamsetu:roles';

/**
 * Restricts a route to members of the caller's business with one of these
 * roles (docs/10 §3 steps 2–3). A route with @Roles also requires the caller
 * to belong to a business. Business routes must always declare roles.
 *
 * @example @Roles('OWNER') listEmployees() {}
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
