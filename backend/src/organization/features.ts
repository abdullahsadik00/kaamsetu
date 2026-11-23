import { SetMetadata } from '@nestjs/common';
import type { BusinessType } from '../generated/prisma/client.js';

/**
 * Parts of the app a business may use, by how it works (D-044). The owner
 * picks the type at sign-up and can change it; paid plans will feed in here.
 */
export type Feature = 'TEAMS' | 'EMPLOYEES' | 'STAFF_UPDATES';

const BY_TYPE: Record<BusinessType, readonly Feature[]> = {
  SOLO: [],
  CREW: ['EMPLOYEES'],
  VENDOR: ['TEAMS', 'EMPLOYEES', 'STAFF_UPDATES'],
};

export const featuresFor = (type: BusinessType): Feature[] => [...BY_TYPE[type]];

/** A CREW is the owner and one other person (D-044). */
export const CREW_EMPLOYEE_LIMIT = 1;

export const FEATURE_KEY = 'kaamsetu:feature';

/**
 * Restricts a route (or controller) to businesses whose type includes the
 * feature; others get 403 NOT_IN_BUSINESS_TYPE (D-044). Checked by AuthGuard.
 *
 * @example @Feature('TEAMS') listTeams() {}
 */
export const Feature = (feature: Feature) => SetMetadata(FEATURE_KEY, feature);
