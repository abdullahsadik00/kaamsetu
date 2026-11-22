import type { IconName } from '@/components/ui/icon';

export type JobType = 'SERVICE' | 'REPAIR' | 'INSTALLATION' | 'UNINSTALLATION' | 'GAS_FILLING' | 'OTHER';
export const JOB_TYPES: JobType[] = ['SERVICE', 'REPAIR', 'INSTALLATION', 'UNINSTALLATION', 'GAS_FILLING', 'OTHER'];

/** One icon per job type, the only map every screen uses (BUG-16: Service and Repair looked the same). */
export const JOB_TYPE_ICON: Record<JobType, IconName> = {
  SERVICE: 'air-conditioner',
  REPAIR: 'wrench-outline',
  INSTALLATION: 'hammer-screwdriver',
  UNINSTALLATION: 'package-variant-closed-remove',
  GAS_FILLING: 'gas-cylinder',
  OTHER: 'dots-horizontal-circle-outline',
};

/** Icon for a job type as it comes from the server or the phone; unknown types get OTHER's. */
export const jobTypeIcon = (type: string): IconName => JOB_TYPE_ICON[type as JobType] ?? JOB_TYPE_ICON.OTHER;
