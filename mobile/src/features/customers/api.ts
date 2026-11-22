import { queryOptions } from '@tanstack/react-query';

import { api } from '@/features/auth/session';

export type CustomerType = 'INDIVIDUAL' | 'BUSINESS';
export type AcType = 'SPLIT' | 'WINDOW' | 'CASSETTE' | 'DUCTABLE' | 'TOWER' | 'OTHER';

export type CustomerRow = {
  id: string;
  type: CustomerType;
  name: string;
  phone: string;
  archivedAt: string | null;
  place: string | null;
  acCount: number;
};

export type Equipment = {
  id: string;
  siteId: string;
  type: AcType;
  brand: string | null;
  capacityTons: number | null;
  locationLabel: string | null;
  model: string | null;
  serialNumber: string | null;
  refrigerant: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
};

export type Site = {
  id: string;
  label: string | null;
  addressLine1: string;
  locality: string | null;
  city: string | null;
  landmark: string | null;
  isDefault: boolean;
  equipment: Equipment[];
};

export type Customer = {
  id: string;
  type: CustomerType;
  name: string;
  phone: string;
  alternatePhone: string | null;
  notes: string | null;
  gstBills: boolean;
  gstin: string | null;
  archivedAt: string | null;
  sites: Site[];
};

export type SiteInput = {
  label?: string;
  addressLine1: string;
  locality?: string;
  city?: string;
  landmark?: string;
};

export const CUSTOMERS_KEY = ['customers'] as const;

/** Customer list; `archived` shows only archived customers (to find and bring one back). */
export const useCustomers = (q: string, archived = false) =>
  queryOptions({
    queryKey: [...CUSTOMERS_KEY, 'list', q, archived],
    queryFn: () => {
      const params = [q ? `q=${encodeURIComponent(q)}` : null, archived ? 'archived=true' : null].filter(Boolean).join('&');
      return api.get<CustomerRow[]>(`/customers${params ? `?${params}` : ''}`);
    },
  });

export const useCustomer = (id: string) =>
  queryOptions({
    queryKey: [...CUSTOMERS_KEY, id],
    queryFn: () => api.get<Customer>(`/customers/${id}`),
  });

export const createCustomer = (body: {
  type: CustomerType;
  name: string;
  phone: string;
  gstBills: boolean;
  notes?: string;
  site: SiteInput;
  allowDuplicatePhone?: boolean;
}) => api.post<Customer>('/customers', body);

export const updateCustomer = (
  id: string,
  body: Partial<{
    type: CustomerType;
    name: string;
    phone: string;
    notes: string | null;
    gstBills: boolean;
    archived: boolean;
  }>,
) => api.request<Customer>('PATCH', `/customers/${id}`, { body });

export const addSite = (customerId: string, body: SiteInput) =>
  api.post<Customer>(`/customers/${customerId}/sites`, body);

export const addEquipment = (body: {
  customerId: string;
  siteId: string;
  type: AcType;
  brand?: string;
  capacityTons?: number | null;
  locationLabel?: string;
  model?: string;
  serialNumber?: string;
  refrigerant?: string;
}) => api.post<Equipment>('/equipment', body);

export const archiveEquipment = (id: string) =>
  api.request<Equipment>('PATCH', `/equipment/${id}`, { body: { archived: true } });

/** "+919822045001" → "+91 98220 45001" */
export function displayPhone(e164: string): string {
  const d = e164.replace(/^\+91/, '');
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : e164;
}

/** "1.5 ton · Split · Voltas" */
export function acSummary(e: Equipment, typeLabel: string): string {
  return [e.capacityTons ? `${e.capacityTons} ton` : null, typeLabel, e.brand]
    .filter(Boolean)
    .join(' · ');
}
