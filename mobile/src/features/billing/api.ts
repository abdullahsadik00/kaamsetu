import { queryOptions } from '@tanstack/react-query';

import { api } from '@/features/auth/session';
import type { Tone } from '@/theme/tokens';

// ---------- API (docs/06 §8, T4.10/T4.11, D-034). Money is always integer paise. ----------

export type Kind = 'BILL' | 'QUOTATION';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'CONVERTED' | 'CANCELLED';
export type PayState = 'NOT_PAID' | 'PARTLY_PAID' | 'PAID';
export type PayMode = 'CASH' | 'UPI' | 'BANK' | 'OTHER';
export type BillFilter = 'TO_COLLECT' | 'NOT_PAID' | 'PARTLY_PAID' | 'PAID' | 'ALL';

export type BillRow = {
  id: string;
  kind: Kind;
  number: string;
  status: InvoiceStatus;
  payState: PayState | null;
  customerId: string;
  customerName: string;
  billDate: string;
  gstBill: boolean;
  total: number;
  paid: number;
  remaining: number;
  jobId: string | null;
  jobNumber: number | null;
};

export type ItemInput = { description: string; qty: number; unitPrice: number; gstRate: number };

export type Payment = {
  id: string;
  amount: number;
  mode: PayMode;
  receivedAt: string;
  note: string | null;
  fromTeam: boolean;
  voidedAt: string | null;
  voidReason: string | null;
};

export type Collection = { id: string; amount: number; mode: 'CASH' | 'UPI'; status: 'WITH_TEAM' | 'CONFIRMED' | 'REJECTED' };

export type Bill = BillRow & {
  subtotal: number;
  discount: number;
  taxTotal: number;
  gst: { rate: number; taxable: number; cgst: number; sgst: number }[];
  sellerGstin: string | null;
  buyerGstin: string | null;
  business: { name: string; phone: string };
  cancelReason: string | null;
  version: number;
  customer: { id: string; name: string; phone: string; gstin: string | null } | null;
  siteId?: string | null;
  fromQuotation: { id: string; number: string } | null;
  convertedToBill: { id: string; number: string } | null;
  items: (ItemInput & { id: string; amount: number; cgst: number; sgst: number })[];
  payments: Payment[];
  collections: Collection[];
};

export type Prefill = {
  jobId: string;
  jobNumber: number;
  jobType: string;
  customer: { id: string; name: string; phone: string; gstBills: boolean; gstin: string | null };
  siteId: string;
  gstBill: boolean;
  items: (ItemInput & { source: 'SERVICE' | 'PART' })[];
  collections: Collection[];
  existingBillId: string | null;
};

export type CashRow = {
  id: string;
  jobId: string;
  jobNumber: number | null;
  customerName: string;
  collectedBy: string;
  amount: number;
  mode: 'CASH' | 'UPI';
  status: Collection['status'];
};

export type Summary = {
  toCollect: number;
  cashWithTeams: number;
  readyToBill: { jobId: string; jobNumber: number; type: string; customerId: string; customerName: string; completedAt: string | null }[];
  cash: CashRow[];
};

export const BILLING_KEY = ['billing'] as const;
export const useSummary = () =>
  queryOptions({ queryKey: [...BILLING_KEY, 'summary'], queryFn: () => api.get<Summary>('/billing/summary') });
export const useBills = (filter: BillFilter) =>
  queryOptions({ queryKey: [...BILLING_KEY, 'bills', filter], queryFn: () => api.get<BillRow[]>(`/bills?filter=${filter}`) });
export const useQuotations = () =>
  queryOptions({ queryKey: [...BILLING_KEY, 'quotations'], queryFn: () => api.get<BillRow[]>('/quotations') });
export const useInvoice = (kind: Kind, id: string) =>
  queryOptions({
    queryKey: [...BILLING_KEY, kind, id],
    queryFn: () => api.get<Bill>(`/${kind === 'BILL' ? 'bills' : 'quotations'}/${id}`),
  });
export const usePrefill = (jobId: string) =>
  queryOptions({ queryKey: [...BILLING_KEY, 'prefill', jobId], queryFn: () => api.get<Prefill>(`/bills/prefill?jobId=${jobId}`) });

/** Badge for a bill or quotation row: paid state for saved bills, else its status. */
export function badgeFor(r: Pick<BillRow, 'kind' | 'status' | 'payState'>): { key: string; tone: Tone } {
  if (r.kind === 'QUOTATION') {
    const tone: Record<InvoiceStatus, Tone> = { DRAFT: 'grey', ISSUED: 'info', CONVERTED: 'ok', CANCELLED: 'grey' };
    return { key: `uiBilling.q_${r.status}`, tone: tone[r.status] };
  }
  if (r.status === 'ISSUED' && r.payState) {
    const tone: Record<PayState, Tone> = { NOT_PAID: 'bad', PARTLY_PAID: 'orange', PAID: 'ok' };
    return { key: `uiBilling.f_${r.payState}`, tone: tone[r.payState] };
  }
  return { key: `uiBilling.st_${r.status}`, tone: 'grey' };
}

// ---------- Money (paise) ----------

/** 1234567 → "12,34,567" (Indian grouping, no Intl needed). */
function groupIndian(n: number): string {
  const s = String(n);
  if (s.length <= 3) return s;
  return `${s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${s.slice(-3)}`;
}

/** Paise → "₹12,304" or "₹324.50". */
export function rupees(paise: number): string {
  const sign = paise < 0 ? '−' : '';
  const abs = Math.abs(Math.round(paise));
  const p = abs % 100;
  return `${sign}₹${groupIndian(Math.floor(abs / 100))}${p ? `.${String(p).padStart(2, '0')}` : ''}`;
}

/** "1,550.5" or "₹ 500" → paise; null when it is not an amount. */
export function parseRupees(text: string): number | null {
  const s = text.replace(/[₹,\s]/g, '');
  const m = /^(\d{1,8})(?:\.(\d{0,2}))?$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}

/** Paise → what to show in an amount field ("1550" or "1550.50"). */
export const toInput = (paise: number) => (paise % 100 ? (paise / 100).toFixed(2) : String(paise / 100));

export const GST_RATES = [0, 5, 12, 18, 28] as const;

/** Half-up rounding of num / den for non-negative integers. */
const divRound = (num: number, den: number) => Math.floor((2 * num + den) / (2 * den));

/**
 * Same arithmetic as the server (backend/src/billing/money.ts), only to show
 * totals while typing; the server works them out again when saving.
 */
export function billTotals(items: ItemInput[], discount: number, gstBill: boolean) {
  const amounts = items.map((i) => i.qty * i.unitPrice);
  const subtotal = amounts.reduce((s, a) => s + a, 0);
  const d = Math.min(Math.max(discount, 0), subtotal);
  const shares = amounts.map((a) => (subtotal ? Math.floor((d * a) / subtotal) : 0));
  let left = d - shares.reduce((s, a) => s + a, 0);
  amounts
    .map((a, i) => ({ i, rest: subtotal ? (d * a) % subtotal : 0 }))
    .sort((x, y) => y.rest - x.rest || x.i - y.i)
    .forEach(({ i }) => {
      if (left > 0) {
        shares[i] += 1;
        left -= 1;
      }
    });
  const byRate = new Map<number, { rate: number; cgst: number; sgst: number }>();
  let taxTotal = 0;
  items.forEach((item, i) => {
    if (!gstBill || !item.gstRate) return;
    const half = divRound((amounts[i] - shares[i]) * item.gstRate, 200);
    taxTotal += 2 * half;
    const row = byRate.get(item.gstRate) ?? { rate: item.gstRate, cgst: 0, sgst: 0 };
    row.cgst += half;
    row.sgst += half;
    byRate.set(item.gstRate, row);
  });
  return {
    subtotal,
    discount: d,
    taxTotal,
    total: subtotal - d + taxTotal,
    gst: [...byRate.values()].sort((x, y) => x.rate - y.rate),
  };
}

/** wa.me link with a ready message (no PDF yet: expo-print is not installed, D-034). */
export function whatsappLink(phone: string | undefined, text: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
