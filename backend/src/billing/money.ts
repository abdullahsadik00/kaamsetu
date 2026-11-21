/**
 * Bill arithmetic in integer paise (docs/11 §3, docs/12 §2 money suite).
 * Pure functions: the service saves exactly what these return, so the phone's
 * totals are never trusted.
 *
 * GST (provisional until Q-04, D-034): per line, intra-state only, so the
 * rate is split half CGST and half SGST, each half rounded to the paisa.
 * The bill discount is shared over the lines in proportion to their amount
 * before tax.
 */

export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number];

export type LineInput = { qty: number; unitPrice: number; gstRate: number };
export type LineTotals = { amount: number; discountShare: number; cgst: number; sgst: number };
export type BillTotals = {
  lines: LineTotals[];
  subtotal: number;
  discount: number;
  taxTotal: number;
  total: number;
  /** CGST/SGST per rate, for the bill page and the shared summary. */
  gst: { rate: number; taxable: number; cgst: number; sgst: number }[];
};

/** Half-up rounding of `num / den` for non-negative integers, without floats. */
export function divRound(num: number, den: number): number {
  return Math.floor((2 * num + den) / (2 * den));
}

/**
 * Shares `discount` over `amounts` in proportion, largest remainder first
 * (earlier line wins a tie), so the shares always add up exactly.
 */
export function shareDiscount(amounts: number[], discount: number): number[] {
  const total = amounts.reduce((s, a) => s + a, 0);
  if (discount <= 0 || total <= 0) return amounts.map(() => 0);
  const shares = amounts.map((a) => Math.floor((discount * a) / total));
  let left = discount - shares.reduce((s, a) => s + a, 0);
  const order = amounts
    .map((a, i) => ({ i, rest: (discount * a) % total }))
    .sort((x, y) => y.rest - x.rest || x.i - y.i);
  for (const { i } of order) {
    if (left === 0) break;
    shares[i] += 1;
    left -= 1;
  }
  return shares;
}

/** One half of the GST on a taxable amount (CGST or SGST): taxable × rate / 2 %. */
export const halfGst = (taxable: number, rate: number) => divRound(taxable * rate, 200);

/**
 * Totals for a bill. `discount` above the subtotal is refused by the caller
 * (DISCOUNT_TOO_BIG); here it is capped so the result is never negative.
 */
export function billTotals(items: LineInput[], discount: number, gstBill: boolean): BillTotals {
  const amounts = items.map((i) => i.qty * i.unitPrice);
  const subtotal = amounts.reduce((s, a) => s + a, 0);
  const d = Math.min(Math.max(discount, 0), subtotal);
  const shares = shareDiscount(amounts, d);
  const lines = items.map((item, i) => {
    const taxable = amounts[i] - shares[i];
    const half = gstBill ? halfGst(taxable, item.gstRate) : 0;
    return { amount: amounts[i], discountShare: shares[i], cgst: half, sgst: half };
  });
  const taxTotal = lines.reduce((s, l) => s + l.cgst + l.sgst, 0);
  const byRate = new Map<number, { rate: number; taxable: number; cgst: number; sgst: number }>();
  if (gstBill) {
    items.forEach((item, i) => {
      if (!item.gstRate) return;
      const row = byRate.get(item.gstRate) ?? { rate: item.gstRate, taxable: 0, cgst: 0, sgst: 0 };
      row.taxable += lines[i].amount - lines[i].discountShare;
      row.cgst += lines[i].cgst;
      row.sgst += lines[i].sgst;
      byRate.set(item.gstRate, row);
    });
  }
  return {
    lines,
    subtotal,
    discount: d,
    taxTotal,
    total: subtotal - d + taxTotal,
    gst: [...byRate.values()].sort((x, y) => x.rate - y.rate),
  };
}

export type PayState = 'NOT_PAID' | 'PARTLY_PAID' | 'PAID';

/** Not paid / Partly paid / Paid for a bill's total and what was received. */
export function payState(total: number, paid: number): PayState {
  if (paid <= 0 && total > 0) return 'NOT_PAID';
  return paid >= total ? 'PAID' : 'PARTLY_PAID';
}

/** What is still to collect (0 when paid in full or more). */
export const remaining = (total: number, paid: number) => Math.max(total - paid, 0);

/** KS-0001 for bills, Q-001 for quotations. */
export const billLabel = (kind: 'BILL' | 'QUOTATION', n: number) =>
  kind === 'BILL' ? `KS-${String(n).padStart(4, '0')}` : `Q-${String(n).padStart(3, '0')}`;
