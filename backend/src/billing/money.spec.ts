import { billLabel, billTotals, divRound, halfGst, payState, remaining, shareDiscount } from './money.js';

describe('bill money (paise, D-034)', () => {
  it('rounds half up without floats', () => {
    expect(divRound(5, 2)).toBe(3);
    expect(divRound(4, 2)).toBe(2);
    expect(divRound(7, 3)).toBe(2);
    expect(divRound(0, 7)).toBe(0);
  });

  it('shares a discount exactly over the lines', () => {
    expect(shareDiscount([360000, 270000], 20000)).toEqual([11429, 8571]);
    expect(shareDiscount([100, 100, 100], 100)).toEqual([34, 33, 33]);
    expect(shareDiscount([500], 0)).toEqual([0]);
    expect(shareDiscount([0, 0], 50)).toEqual([0, 0]);
    for (const d of [1, 7, 99, 12345]) {
      expect(shareDiscount([333, 667, 1000, 1], d).reduce((s, a) => s + a, 0)).toBe(d);
    }
  });

  it('adds lines and takes off the discount (Stitch 38: ₹3,600 + ₹2,700 − ₹200 = ₹6,100)', () => {
    const t = billTotals(
      [
        { qty: 2, unitPrice: 180000, gstRate: 18 },
        { qty: 6, unitPrice: 45000, gstRate: 18 },
      ],
      20000,
      false,
    );
    expect(t).toMatchObject({ subtotal: 630000, discount: 20000, taxTotal: 0, total: 610000, gst: [] });
    expect(t.lines.map((l) => l.cgst + l.sgst)).toEqual([0, 0]);
  });

  it('GST bill: CGST + SGST per line (Stitch 35: 2 × ₹1,800 at 18% = ₹324 + ₹324)', () => {
    const t = billTotals([{ qty: 2, unitPrice: 180000, gstRate: 18 }], 0, true);
    expect(t).toMatchObject({ subtotal: 360000, taxTotal: 64800, total: 424800 });
    expect(t.gst).toEqual([{ rate: 18, taxable: 360000, cgst: 32400, sgst: 32400 }]);
  });

  it('GST is charged after the discount, per rate, rounded per half', () => {
    const t = billTotals(
      [
        { qty: 1, unitPrice: 99999, gstRate: 5 },
        { qty: 3, unitPrice: 333, gstRate: 28 },
        { qty: 1, unitPrice: 5000, gstRate: 0 },
      ],
      1001,
      true,
    );
    // amounts 99999, 999, 5000 = 105998; discount shares add up to 1001
    expect(t.lines.reduce((s, l) => s + l.discountShare, 0)).toBe(1001);
    const taxable0 = 99999 - t.lines[0].discountShare;
    expect(t.lines[0].cgst).toBe(Math.round((taxable0 * 2.5) / 100));
    expect(t.lines[2].cgst).toBe(0);
    expect(t.total).toBe(105998 - 1001 + t.taxTotal);
    expect(t.gst.map((g) => g.rate)).toEqual([5, 28]);
  });

  it('half GST rounds to the nearest paisa', () => {
    expect(halfGst(100, 5)).toBe(3); // 2.5 → 3
    expect(halfGst(99, 18)).toBe(9); // 8.91 → 9
    expect(halfGst(1, 12)).toBe(0); // 0.06 → 0
  });

  it('never goes below zero when the discount is too big', () => {
    expect(billTotals([{ qty: 1, unitPrice: 500, gstRate: 0 }], 900, false).total).toBe(0);
  });

  it('paid state and what is left', () => {
    expect(payState(610000, 0)).toBe('NOT_PAID');
    expect(payState(610000, 300000)).toBe('PARTLY_PAID');
    expect(payState(610000, 610000)).toBe('PAID');
    expect(payState(610000, 700000)).toBe('PAID');
    expect(payState(0, 0)).toBe('PAID');
    expect(remaining(610000, 300000)).toBe(310000);
    expect(remaining(100, 150)).toBe(0);
  });

  it('labels bills KS-0001 and quotations Q-001', () => {
    expect(billLabel('BILL', 86)).toBe('KS-0086');
    expect(billLabel('QUOTATION', 31)).toBe('Q-031');
    expect(billLabel('BILL', 12345)).toBe('KS-12345');
  });
});
