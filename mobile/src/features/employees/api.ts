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

export const resetLogin = (id: string) =>
  api.post<{ reset: boolean }>(`/employees/${id}/reset-login`);
