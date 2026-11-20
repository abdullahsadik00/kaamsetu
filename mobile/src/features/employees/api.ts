import { queryOptions } from '@tanstack/react-query';

import type { Role } from '@/api/token-store';
import { api } from '@/features/auth/session';

/** `GET /employees` row (backend OrganizationController). */
export type Employee = {
  id: string;
  role: Role;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  joinedAt: string;
  user: { name: string; phone: string | null };
  /** A Google login is linked (D-025). */
  loginLinked: boolean;
};

export type Invite = { qr: string; code: string; expiresAt: string };

export type StaffRole = Exclude<Role, 'OWNER'>;

export const EMPLOYEES_KEY = ['employees'] as const;

export const useEmployees = () =>
  queryOptions({
    queryKey: EMPLOYEES_KEY,
    queryFn: () => api.get<Employee[]>('/employees'),
  });

export const useEmployee = (id: string) =>
  queryOptions({
    queryKey: [...EMPLOYEES_KEY, id],
    queryFn: () => api.get<Employee>(`/employees/${id}`),
  });

export const createInvite = (id: string) => api.post<Invite>(`/employees/${id}/invite`);

/** Owner adds a senior technician or helper (D-027). Phone in E.164. */
export const addEmployee = (body: { name: string; phone: string; role: StaffRole }) =>
  api.post<Employee>('/employees', body);

/** Owner removes someone who left: signed out at once (D-027). */
export const deactivateEmployee = (id: string) =>
  api.post<{ removed: boolean }>(`/employees/${id}/deactivate`);

/** `GET /organization`. */
export type Business = {
  id: string;
  name: string;
  phone: string;
  city: string | null;
  gstBills: boolean;
  gstin: string | null;
};

export const ORGANIZATION_KEY = ['organization'] as const;

export const useBusiness = () =>
  queryOptions({
    queryKey: ORGANIZATION_KEY,
    queryFn: () => api.get<Business>('/organization'),
  });

/** Owner edits business details; send only what changed; gstin null clears it. */
export const updateBusiness = (
  body: Partial<Pick<Business, 'name' | 'phone' | 'city' | 'gstBills' | 'gstin'>>,
) => api.request<Business>('PATCH', '/organization', { body });

export const resetLogin = (id: string) =>
  api.post<{ reset: boolean }>(`/employees/${id}/reset-login`);
