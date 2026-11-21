import { queryOptions } from '@tanstack/react-query';

import { api } from '@/features/auth/session';
import type { Tone } from '@/theme/tokens';

// ---------- API (docs/06 §8, T4.10/T4.11, D-034). Money is always integer paise. ----------

export type Kind = 'BILL' | 'QUOTATION';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'CONVERTED' | 'CANCELLED';
export type PayState = 'NOT_PAID' | 'PARTLY_PAID' | 'PAID';
export type PayMode = 'CASH' | 'UPI' | 'BANK' | 'OTHER';
export type BillFilter = 'TO_COLLECT' | 'NOT_PAID' | 'PARTLY_PAID' | 'PAID' | 'ALL';
export type CashStatus = 'WITH_TEAM' | 'CONFIRMED' | 'REJECTED';

export const PAY_MODES: PayMode[] = ['CASH', 'UPI', 'BANK', 'OTHER'];
export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number];

/** A bill or quotation in a list (BillingService.decorate). */
export type BillRow = {
  id: string;
  kind: Kind;
  /** KS-0001 or Q-001. */
  number: string;
  status: InvoiceStatus;
  /** Only for issued bills. */
  payState: PayState | null;
  customerId: string;
  customerName: string;
  /** YYYY-MM-DD. */
  billDate: string;
  gstBill: boolean;
  total: number;
  paid: number;
  remaining: number;
  jobId: string | null;
  jobNumber: number | null;
};

export type ItemInput = { description: string; qty: number; unitPrice: number; gstRate: GstRate };

export type Payment = {
  id: string;
  billId: string;
  amount: number;
  mode: PayMode;
  /** YYYY-MM-DD. */
  receivedAt: string;
  note: string | null;
  /** Made from cash a team handed over. */
  fromTeam: boolean;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
};

export type Collection = { id: string; amount: number; mode: 'CASH' | 'UPI'; status: CashStatus; paymentId?: string | null };

export type Bill = BillRow & {
  subtotal: number;
  discount: number;
  taxTotal: number;
  gst: { rate: number; taxable: number; cgst: number; sgst: number }[];
  sellerGstin: string | null;
  buyerGstin: string | null;
  business: { name: string; phone: string };
  issuedAt: string | null;
  cancelReason: string | null;
  version: number;
  customer: { id: string; name: string; phone: string; gstin: string | null } | null;
  site: { id: string; label: string | null; addressLine1: string; locality: string | null; city: string | null } | null;
  fromQuotation: { id: string; number: string } | null;
  convertedToBill: { id: string; number: string } | null;
  items: (ItemInput & { id: string; amount: number; cgst: number; sgst: number })[];
  payments: Payment[];
  /** Money the team took on site for this job (D-008). */
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
  status: CashStatus;
  rejectReason: string | null;
  paymentId: string | null;
  at: string;
};

export type ReadyToBill = {
  jobId: string;
  jobNumber: number;
  type: string;
  customerId: string;
  customerName: string;
  completedAt: string | null;
  amountToCollect: number | null;
};

export type Summary = { toCollect: number; cashWithTeams: number; readyToBill: ReadyToBill[]; cash: CashRow[] };

export type Outstanding = { customerId: string; customerName: string; billed: number; received: number; outstanding: number };

export const BILLING_KEY = ['billing'] as const;

const path = (kind: Kind) => (kind === 'BILL' ? '/bills' : '/quotations');

export const useSummary = () =>
  queryOptions({ queryKey: [...BILLING_KEY, 'summary'], queryFn: () => api.get<Summary>('/billing/summary') });
export const useBills = (filter: BillFilter) =>
  queryOptions({ queryKey: [...BILLING_KEY, 'bills', filter], queryFn: () => api.get<BillRow[]>(`/bills?filter=${filter}`) });
export const useQuotations = (status: 'OPEN' | 'ALL' = 'ALL') =>
  queryOptions({ queryKey: [...BILLING_KEY, 'quotations', status], queryFn: () => api.get<BillRow[]>(`/quotations?status=${status}`) });
export const useInvoice = (kind: Kind, id: string) =>
  queryOptions({ queryKey: [...BILLING_KEY, kind, id], queryFn: () => api.get<Bill>(`${path(kind)}/${id}`) });
export const usePrefill = (jobId: string) =>
  queryOptions({ queryKey: [...BILLING_KEY, 'prefill', jobId], queryFn: () => api.get<Prefill>(`/bills/prefill?jobId=${jobId}`) });
export const useOutstanding = (customerId: string) =>
  queryOptions({
    queryKey: [...BILLING_KEY, 'outstanding', customerId],
    queryFn: () => api.get<Outstanding>(`/customers/${customerId}/outstanding`),
  });

export type NewInvoice = {
  customerId?: string;
  siteId?: string;
  jobId?: string;
  gstBill?: boolean;
  discount: number;
  billDate?: string;
  items: ItemInput[];
};

/** Saves a draft bill (KS-…) or quotation (Q-…); the server works out the totals. */
export const createInvoice = (kind: Kind, body: NewInvoice) => api.post<Bill>(path(kind), body);

/** Edits a draft (or an open quotation). `version` is what the owner saw; a stale one gives VERSION_CONFLICT. */
export const updateInvoice = (
  kind: Kind,
  id: string,
  body: { version: number; gstBill?: boolean; discount?: number; billDate?: string; items?: ItemInput[] },
) => api.request<Bill>('PATCH', `${path(kind)}/${id}`, { body });

export const issueBill = (id: string) => api.post<Bill>(`/bills/${id}/issue`);
export const cancelInvoice = (kind: Kind, id: string, reason: string) => api.post<Bill>(`${path(kind)}/${id}/cancel`, { reason });
export const sendQuotation = (id: string) => api.post<Bill>(`/quotations/${id}/send`);
/** Returns the new draft bill. */
export const convertQuotation = (id: string) => api.post<Bill>(`/quotations/${id}/convert`);

export type PaymentInput = {
  amount: number;
  mode: PayMode;
  receivedAt?: string;
  note?: string;
  /** One per payment form: sending it again returns the same payment, so a double tap saves once. */
  idempotencyKey: string;
  allowOverpay?: boolean;
};
export const recordPayment = (billId: string, body: PaymentInput) => api.post<Payment>(`/bills/${billId}/payments`, body);
export const voidPayment = (id: string, reason: string) => api.post<Payment>(`/payments/${id}/void`, { reason });

export const confirmCash = (id: string, addToBill = true) => api.post<CashRow>(`/cash-collections/${id}/confirm`, { addToBill });
export const rejectCash = (id: string, reason: string) => api.post<CashRow>(`/cash-collections/${id}/reject`, { reason });

/** Badge for a bill or quotation: paid state for issued bills, else its status. */
export function badgeFor(r: Pick<BillRow, 'kind' | 'status' | 'payState'>): { key: string; tone: Tone } {
  if (r.kind === 'QUOTATION') {
    const tone: Record<InvoiceStatus, Tone> = { DRAFT: 'grey', ISSUED: 'info', CONVERTED: 'ok', CANCELLED: 'bad' };
    return { key: `uiBilling.q_${r.status}`, tone: tone[r.status] };
  }
  if (r.status === 'ISSUED' && r.payState) {
    const tone: Record<PayState, Tone> = { NOT_PAID: 'bad', PARTLY_PAID: 'orange', PAID: 'ok' };
    return { key: `uiBilling.pay_${r.payState}`, tone: tone[r.payState] };
  }
  return { key: `uiBilling.st_${r.status}`, tone: r.status === 'CANCELLED' ? 'bad' : 'grey' };
}

// ---------- Money (paise) ----------

/** "1234567" → "12,34,567" (Indian grouping, no Intl needed). */
function groupIndian(n: number): string {
  const s = String(n);
  if (s.length <= 3) return s;
  return `${s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${s.slice(-3)}`;
}

/** Paise → "₹12,304" or "₹324.50". Display only. */
export function rupees(paise: number): string {
  const sign = paise < 0 ? '−' : '';
  const abs = Math.abs(Math.round(paise));
  const p = abs % 100;
  return `${sign}₹${groupIndian(Math.floor(abs / 100))}${p ? `.${String(p).padStart(2, '0')}` : ''}`;
}

/** Largest amount the server takes for a line, bill or payment: ₹1 crore. */
export const MAX_PAISE = 1_000_000_000;

/** "1,550.5" or "₹ 500" → paise; null when it is not an amount (or above ₹1 crore). */
export function parseRupees(text: string): number | null {
  const s = text.replace(/[₹,\s]/g, '');
  const m = /^(\d{1,8})(?:\.(\d{0,2}))?$/.exec(s);
  if (!m) return null;
  const paise = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
  return paise > MAX_PAISE ? null : paise;
}

/** Paise → what to show in an amount field ("1550" or "1550.50"). */
export const toInput = (paise: number) => (paise % 100 ? (paise / 100).toFixed(2) : String(paise / 100));

/** Half-up rounding of num / den for non-negative integers. */
const divRound = (num: number, den: number) => Math.floor((2 * num + den) / (2 * den));

/** Bill discount shared over lines by amount, largest remainder first (same as the server). */
function shareDiscount(amounts: number[], discount: number): number[] {
  const total = amounts.reduce((s, a) => s + a, 0);
  if (discount <= 0 || total <= 0) return amounts.map(() => 0);
  const shares = amounts.map((a) => Math.floor((discount * a) / total));
  let left = discount - shares.reduce((s, a) => s + a, 0);
  const order = amounts.map((a, i) => ({ i, rest: (discount * a) % total })).sort((x, y) => y.rest - x.rest || x.i - y.i);
  for (const { i } of order) {
    if (left === 0) break;
    shares[i] += 1;
    left -= 1;
  }
  return shares;
}

/**
 * Same arithmetic as the server (backend/src/billing/money.ts), only to show
 * totals while typing; the server works them out again when saving.
 * GST is provisional (Q-04): per line, half CGST and half SGST.
 */
export function billTotals(items: Pick<ItemInput, 'qty' | 'unitPrice' | 'gstRate'>[], discount: number, gstBill: boolean) {
  const amounts = items.map((i) => i.qty * i.unitPrice);
  const subtotal = amounts.reduce((s, a) => s + a, 0);
  const d = Math.min(Math.max(discount, 0), subtotal);
  const shares = shareDiscount(amounts, d);
  const byRate = new Map<number, { rate: number; taxable: number; cgst: number; sgst: number }>();
  let taxTotal = 0;
  items.forEach((item, i) => {
    if (!gstBill || !item.gstRate) return;
    const taxable = amounts[i] - shares[i];
    const half = divRound(taxable * item.gstRate, 200);
    taxTotal += 2 * half;
    const row = byRate.get(item.gstRate) ?? { rate: item.gstRate, taxable: 0, cgst: 0, sgst: 0 };
    row.taxable += taxable;
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

/** wa.me link with a ready message (payment reminder). */
export function whatsappLink(phone: string | undefined, text: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** "18 Nov 2026" for a YYYY-MM-DD date. */
export function longDate(d: string): string {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  const date = new Date(y, m - 1, day);
  return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
