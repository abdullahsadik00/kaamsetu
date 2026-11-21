import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/api/errors';
import { api } from '@/features/auth/session';
import { CustomerScreen } from '@/features/customers/customer-screen';
import { renderScreen, setupI18n } from '@/testing/render';

import { billTotals, parseRupees, rupees } from './api';
import { BillingScreen } from './billing-screen';
import { InvoiceFormScreen } from './invoice-form';
import { InvoiceScreen } from './invoice-screen';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories cannot use imports
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: {
    push: (...a: unknown[]) => mockPush(...a),
    replace: (...a: unknown[]) => mockReplace(...a),
    back: (...a: unknown[]) => mockBack(...a),
    navigate: jest.fn(),
  },
  useLocalSearchParams: () => mockParams,
  // Render header buttons (More) so tests can press them.
  Stack: { Screen: ({ options }: { options?: { headerRight?: () => unknown } }) => options?.headerRight?.() ?? null },
}));
jest.setTimeout(30000);
let mockKeys = 0;
jest.mock('expo-crypto', () => ({ randomUUID: () => `key-${++mockKeys}-0000` }));
const mockPrint = jest.fn(async (_o: { html: string }) => ({ uri: 'file:///bill.pdf' }));
const mockShare = jest.fn(async (_uri: string, _o?: object) => undefined);
jest.mock('expo-print', () => ({ printToFileAsync: (o: { html: string }) => mockPrint(o) }));
jest.mock('expo-sharing', () => ({ shareAsync: (u: string, o?: object) => mockShare(u, o) }));

const row = {
  id: 'bill-1',
  kind: 'BILL',
  number: 'KS-0086',
  status: 'ISSUED',
  payState: 'PARTLY_PAID',
  customerId: 'cust-1',
  customerName: 'Anil Deshpande',
  billDate: '2026-11-12',
  gstBill: false,
  total: 610000,
  paid: 300000,
  remaining: 310000,
  jobId: 'job-1',
  jobNumber: 1036,
};
const bill = {
  ...row,
  subtotal: 630000,
  discount: 20000,
  taxTotal: 0,
  gst: [],
  sellerGstin: null,
  buyerGstin: null,
  business: { name: 'Cool Air Services', phone: '+919822000000' },
  issuedAt: '2026-11-12T10:00:00.000Z',
  cancelReason: null,
  version: 2,
  customer: { id: 'cust-1', name: 'Anil Deshpande', phone: '+919822012345', gstin: null },
  site: { id: 'site-1', label: null, addressLine1: 'Flat 4', locality: 'Kothrud', city: 'Pune' },
  fromQuotation: null,
  convertedToBill: null,
  items: [
    { id: 'i1', description: 'Installation, split AC', qty: 2, unitPrice: 180000, gstRate: 0, amount: 360000, cgst: 0, sgst: 0 },
    { id: 'i2', description: 'Copper pipe', qty: 6, unitPrice: 45000, gstRate: 0, amount: 270000, cgst: 0, sgst: 0 },
  ],
  payments: [
    {
      id: 'pay-1',
      billId: 'bill-1',
      amount: 300000,
      mode: 'CASH',
      receivedAt: '2026-11-12',
      note: null,
      fromTeam: false,
      voidedAt: null,
      voidReason: null,
      createdAt: '2026-11-12T10:00:00.000Z',
    },
  ],
  collections: [],
};
const summary = {
  toCollect: 1230400,
  cashWithTeams: 100000,
  readyToBill: [
    { jobId: 'job-9', jobNumber: 1043, type: 'REPAIR', customerId: 'cust-2', customerName: 'Rohan Kulkarni', completedAt: null, amountToCollect: 50000 },
  ],
  cash: [
    {
      id: 'cash-1',
      jobId: 'job-9',
      jobNumber: 1043,
      customerName: 'Rohan Kulkarni',
      collectedBy: 'Santosh Pawar',
      amount: 100000,
      mode: 'CASH',
      status: 'WITH_TEAM',
      rejectReason: null,
      paymentId: null,
      at: '2026-11-18T10:00:00.000Z',
    },
  ],
};
const prefill = {
  jobId: 'job-9',
  jobNumber: 1043,
  jobType: 'REPAIR',
  customer: { id: 'cust-2', name: 'Rohan Kulkarni', phone: '+919822045001', gstBills: false, gstin: null },
  siteId: 'site-2',
  gstBill: false,
  items: [
    { source: 'SERVICE', description: 'AC repair visit', qty: 1, unitPrice: 50000, gstRate: 0 },
    { source: 'PART', description: 'Drain pipe', qty: 2, unitPrice: 0, gstRate: 0 },
  ],
  collections: [{ id: 'cash-1', amount: 100000, mode: 'CASH', status: 'WITH_TEAM' }],
  existingBillId: null,
};
const business = { id: 'org-1', name: 'Cool Air Services', phone: '+919822000000', city: 'Pune', gstBills: true, gstin: '27ABCDE1234F1Z5' };

/** api.get answers by path prefix. */
function routes(map: Record<string, unknown>) {
  return jest.spyOn(api, 'get').mockImplementation(((p: string) => {
    const hit = Object.keys(map)
      .sort((a, b) => b.length - a.length)
      .find((k) => p.startsWith(k));
    return hit ? Promise.resolve(map[hit]) : Promise.reject(new Error(`unexpected GET ${p}`));
  }) as never);
}

beforeAll(setupI18n);
beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockBack.mockClear();
  mockPrint.mockClear();
  mockShare.mockClear();
  mockParams = {};
});
afterEach(() => jest.restoreAllMocks());

describe('Money in paise (D-034)', () => {
  it('formats and reads rupees without floats', () => {
    expect(rupees(1230400)).toBe('₹12,304');
    expect(rupees(32450)).toBe('₹324.50');
    expect(rupees(1000000000)).toBe('₹1,00,00,000');
    expect(parseRupees('1,550.5')).toBe(155050);
    expect(parseRupees('₹ 500')).toBe(50000);
    expect(parseRupees('12.345')).toBeNull();
    expect(parseRupees('abc')).toBeNull();
    expect(parseRupees('10000001')).toBeNull(); // above ₹1 crore
  });

  it('works out GST and discount like the server', () => {
    // Stitch 35: 2 × ₹1,800 at 18 % → CGST ₹324 + SGST ₹324, total ₹4,248.
    const gst = billTotals([{ qty: 2, unitPrice: 180000, gstRate: 18 }], 0, true);
    expect(gst).toMatchObject({ subtotal: 360000, taxTotal: 64800, total: 424800 });
    expect(gst.gst).toEqual([{ rate: 18, taxable: 360000, cgst: 32400, sgst: 32400 }]);
    // Discount shared over lines by amount; shares always add up exactly.
    const d = billTotals(
      [
        { qty: 1, unitPrice: 100, gstRate: 18 },
        { qty: 1, unitPrice: 200, gstRate: 18 },
      ],
      100,
      true,
    );
    expect(d.discount).toBe(100);
    expect(d.gst[0].taxable).toBe(200);
    // Not a GST bill: rates are ignored.
    expect(billTotals([{ qty: 1, unitPrice: 50000, gstRate: 18 }], 0, false).total).toBe(50000);
  });
});

describe('Billing tab (T4.10/T4.11)', () => {
  it('shows money to collect, jobs to bill and the bill list with paid state', async () => {
    const get = routes({ '/billing/summary': summary, '/bills': [row], '/quotations': [] });
    await renderScreen(<BillingScreen />);
    expect(await screen.findByText('₹12,304')).toBeTruthy();
    expect(screen.getByText('₹1,000 cash with teams')).toBeTruthy();
    expect(screen.getByText('Ready to bill · 1')).toBeTruthy();
    expect(await screen.findByText('Anil Deshpande')).toBeTruthy();
    expect(screen.getByText('₹3,100')).toBeTruthy(); // what is left on a partly paid bill
    expect(screen.getAllByText('Partly paid').length).toBeGreaterThan(0);
    expect(get).toHaveBeenCalledWith('/bills?filter=TO_COLLECT');

    await fireEvent.press(screen.getByText('Make bill'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/bills/new', params: { jobId: 'job-9' } });

    await fireEvent.press(screen.getByText('Paid'));
    await waitFor(() => expect(get).toHaveBeenCalledWith('/bills?filter=PAID'));

    await fireEvent.press(screen.getByText('Quotations'));
    expect(await screen.findByText('No quotations yet')).toBeTruthy();
    expect(get).toHaveBeenCalledWith('/quotations?status=ALL');
  });

  it('confirms or rejects cash a team handed over', async () => {
    routes({ '/billing/summary': summary, '/bills': [] });
    const post = jest.spyOn(api, 'post').mockResolvedValue({} as never);
    await renderScreen(<BillingScreen />);
    await fireEvent.press(await screen.findByText('Got it'));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/cash-collections/cash-1/confirm', { addToBill: true }));

    await fireEvent.press(screen.getByText('Not received'));
    await fireEvent.changeText(screen.getByLabelText('What happened?'), 'Santosh still has it');
    await fireEvent.press(screen.getAllByText('Not received').at(-1)!);
    await waitFor(() => expect(post).toHaveBeenCalledWith('/cash-collections/cash-1/reject', { reason: 'Santosh still has it' }));
  });
});

describe('New bill and quotation (T4.10)', () => {
  it('fills a bill from a completed job, lets the owner change a line and saves a draft', async () => {
    mockParams = { jobId: 'job-9' };
    routes({ '/bills/prefill': prefill, '/organization': { ...business, gstBills: false } });
    const post = jest.spyOn(api, 'post').mockResolvedValue({ ...bill, id: 'bill-9', status: 'DRAFT' } as never);
    await renderScreen(<InvoiceFormScreen kind="BILL" />);
    expect(await screen.findByText('Filled from the work report. Check and change if needed.')).toBeTruthy();
    expect(screen.getByText('Repair')).toBeTruthy(); // service line in the phone's language
    expect(screen.getByText('Received on site · Cash')).toBeTruthy();

    // Price the drain pipe: 2 × ₹75.
    await fireEvent.press(screen.getByText('Drain pipe'));
    await fireEvent.changeText(screen.getByLabelText('Rate'), '75');
    await fireEvent.press(screen.getByText('Save item'));
    expect(screen.getAllByText('₹650')).toHaveLength(2); // subtotal and bill total: ₹500 + ₹150

    await fireEvent.press(screen.getByText('Save draft'));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/bills', {
        jobId: 'job-9',
        siteId: 'site-2',
        gstBill: false,
        discount: 0,
        items: [
          { description: 'Repair', qty: 1, unitPrice: 50000, gstRate: 0 },
          { description: 'Drain pipe', qty: 2, unitPrice: 7500, gstRate: 0 },
        ],
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/bills/[id]', params: { id: 'bill-9' } });
  });

  it('opens the existing bill when the job is already billed', async () => {
    mockParams = { jobId: 'job-9' };
    routes({ '/bills/prefill': { ...prefill, existingBillId: 'bill-1' }, '/organization': business });
    await renderScreen(<InvoiceFormScreen kind="BILL" />);
    await fireEvent.press(await screen.findByText('Open bill'));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/bills/[id]', params: { id: 'bill-1' } });
  });

  it('makes a GST quotation with a discount and shows CGST/SGST as provisional', async () => {
    mockParams = { customerId: 'cust-3' };
    routes({
      '/customers/cust-3': {
        id: 'cust-3',
        type: 'BUSINESS',
        name: 'Hotel Annapurna',
        phone: '+919822011111',
        alternatePhone: null,
        notes: null,
        gstBills: true,
        gstin: '27AACHA4410K1Z3',
        archivedAt: null,
        sites: [{ id: 'site-3', label: null, addressLine1: 'MG Road', locality: null, city: 'Pune', landmark: null, isDefault: true, equipment: [] }],
      },
      '/organization': business,
    });
    const post = jest.spyOn(api, 'post').mockResolvedValue({ ...bill, kind: 'QUOTATION', id: 'q-1', number: 'Q-001' } as never);
    await renderScreen(<InvoiceFormScreen kind="QUOTATION" />);
    await fireEvent.press(await screen.findByText('Save quotation'));
    expect(screen.getByText('Add at least one item.')).toBeTruthy();
    expect(post).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Add item'));
    await fireEvent.changeText(screen.getByLabelText('What was done or fitted'), 'Deep cleaning, cassette AC');
    await fireEvent.changeText(screen.getByLabelText('Qty'), '2');
    await fireEvent.changeText(screen.getByLabelText('Rate'), '1800');
    await fireEvent.press(screen.getByText('Save item'));
    expect(screen.getAllByText('CGST 9%').length).toBeGreaterThan(0);
    expect(screen.getByText('₹4,248')).toBeTruthy();

    await fireEvent.press(screen.getByText('Discount'));
    await fireEvent.changeText(screen.getByLabelText('Discount amount'), '100');
    await fireEvent.press(screen.getByText('Apply discount'));

    await fireEvent.press(screen.getByText('Save quotation'));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/quotations', {
        customerId: 'cust-3',
        siteId: 'site-3',
        gstBill: true,
        discount: 10000,
        items: [{ description: 'Deep cleaning, cassette AC', qty: 2, unitPrice: 180000, gstRate: 18 }],
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/quotations/[id]', params: { id: 'q-1' } });
  });

  it('edits a draft with its version and reloads when someone else changed it', async () => {
    mockParams = { id: 'bill-1' };
    const draft = { ...bill, status: 'DRAFT', payState: null, payments: [] };
    let version = 2;
    jest.spyOn(api, 'get').mockImplementation(((p: string) =>
      Promise.resolve(p.startsWith('/organization') ? business : { ...draft, version })) as never);
    const patch = jest
      .spyOn(api, 'request')
      .mockRejectedValueOnce(new ApiError(409, 'VERSION_CONFLICT', 'changed'))
      .mockResolvedValue(draft as never);
    await renderScreen(<InvoiceFormScreen kind="BILL" />);
    const saveButton = await screen.findByText('Save changes');
    version = 3; // someone saves on another phone meanwhile
    await fireEvent.press(saveButton);
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith('PATCH', '/bills/bill-1', {
        body: expect.objectContaining({ version: 2, discount: 20000 }),
      }),
    );
    expect(await screen.findByText(/changed on another phone/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Save changes'));
    await waitFor(() =>
      expect(patch).toHaveBeenLastCalledWith('PATCH', '/bills/bill-1', { body: expect.objectContaining({ version: 3 }) }),
    );
    expect(mockBack).toHaveBeenCalled();
  });
});

describe('Bill page and payments (T4.11)', () => {
  it('records a payment with one idempotency key, even when the first try fails', async () => {
    mockParams = { id: 'bill-1' };
    routes({ '/bills/bill-1': bill });
    const post = jest
      .spyOn(api, 'post')
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'offline'))
      .mockResolvedValue({} as never);
    await renderScreen(<InvoiceScreen kind="BILL" />);
    expect(await screen.findByText('Installation, split AC')).toBeTruthy();
    expect(screen.getByText('₹3,100')).toBeTruthy();

    await fireEvent.press(screen.getByText('Record payment'));
    await fireEvent.press(screen.getByText('UPI'));
    await fireEvent.press(screen.getByText('Save payment · ₹3,100 UPI'));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    await fireEvent.press(await screen.findByText('Save payment · ₹3,100 UPI'));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    const [first, second] = post.mock.calls.map((c) => c[1] as { idempotencyKey: string; amount: number; mode: string });
    expect(first).toMatchObject({ amount: 310000, mode: 'UPI', allowOverpay: false });
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(post.mock.calls[0][0]).toBe('/bills/bill-1/payments');
  });

  it('asks before taking more than what is left', async () => {
    mockParams = { id: 'bill-1' };
    routes({ '/bills/bill-1': bill });
    const post = jest
      .spyOn(api, 'post')
      .mockRejectedValueOnce(new ApiError(409, 'OVERPAY', 'too much', { remaining: 310000 }))
      .mockResolvedValue({} as never);
    await renderScreen(<InvoiceScreen kind="BILL" />);
    await fireEvent.press(await screen.findByText('Record payment'));
    await fireEvent.changeText(screen.getByLabelText('Amount received now'), '4000');
    await fireEvent.press(screen.getByText('Save payment · ₹4,000 Cash'));
    expect(await screen.findByText('This is more than what is left (₹3,100).')).toBeTruthy();
    await fireEvent.press(screen.getByText('Save anyway'));
    await waitFor(() => expect(post).toHaveBeenLastCalledWith('/bills/bill-1/payments', expect.objectContaining({ amount: 400000, allowOverpay: true })));
  });

  it('removes a payment with a reason and cancels the bill with a reason', async () => {
    mockParams = { id: 'bill-1' };
    routes({ '/bills/bill-1': bill });
    const post = jest.spyOn(api, 'post').mockResolvedValue(bill as never);
    await renderScreen(<InvoiceScreen kind="BILL" />);
    await fireEvent.press(await screen.findByLabelText('Remove payment ₹3,000'));
    await fireEvent.changeText(screen.getByLabelText('Why remove it?'), 'Entered twice');
    await fireEvent.press(screen.getAllByText('Remove payment').at(-1)!);
    await waitFor(() => expect(post).toHaveBeenCalledWith('/payments/pay-1/void', { reason: 'Entered twice' }));

    await fireEvent.press(screen.getByLabelText('More'));
    await fireEvent.press(screen.getByText('Cancel bill'));
    await fireEvent.changeText(screen.getByLabelText('Why cancel?'), 'Wrong customer');
    await fireEvent.press(screen.getAllByText('Cancel bill').at(-1)!);
    await waitFor(() => expect(post).toHaveBeenCalledWith('/bills/bill-1/cancel', { reason: 'Wrong customer' }));
  });

  it('saves (issues) a draft bill and shares the PDF of a saved one', async () => {
    mockParams = { id: 'bill-1' };
    let current: object = { ...bill, status: 'DRAFT', payState: null, payments: [] };
    jest.spyOn(api, 'get').mockImplementation((() => Promise.resolve(current)) as never);
    const post = jest.spyOn(api, 'post').mockImplementation((() => {
      current = bill;
      return Promise.resolve(bill);
    }) as never);
    await renderScreen(<InvoiceScreen kind="BILL" />);
    expect(await screen.findByText(/Draft: the customer has not got it yet/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Save bill'));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/bills/bill-1/issue'));

    await fireEvent.press(await screen.findByText('Send bill'));
    await waitFor(() => expect(mockShare).toHaveBeenCalledWith('file:///bill.pdf', expect.objectContaining({ mimeType: 'application/pdf' })));
    const html = mockPrint.mock.calls[0][0].html;
    expect(html).toContain('KS-0086');
    expect(html).toContain('₹6,100');
    expect(html).toContain('Copper pipe');
  });

  it('quotation: send marks it sent and shares the PDF; turn into bill opens the new bill', async () => {
    mockParams = { id: 'q-1' };
    const quote = { ...bill, id: 'q-1', kind: 'QUOTATION', number: 'Q-031', status: 'DRAFT', payState: null, payments: [], jobId: null, jobNumber: null };
    routes({ '/quotations/q-1': quote });
    const post = jest.spyOn(api, 'post').mockImplementation(((p: string) =>
      Promise.resolve(p.endsWith('/convert') ? { ...bill, id: 'bill-77', status: 'DRAFT' } : { ...quote, status: 'ISSUED' })) as never);
    await renderScreen(<InvoiceScreen kind="QUOTATION" />);
    await fireEvent.press(await screen.findByText('Send quotation'));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/quotations/q-1/send'));
    await waitFor(() => expect(mockShare).toHaveBeenCalled());
    expect(mockPrint.mock.calls[0][0].html).toContain('This is a price quotation, not a bill.');

    await fireEvent.press(screen.getByText('Turn into bill'));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/quotations/q-1/convert'));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/bills/[id]', params: { id: 'bill-77' } });
  });
});

describe('Customer page (T4.11)', () => {
  it('shows what the customer still owes', async () => {
    mockParams = { id: 'cust-1' };
    routes({
      '/customers/cust-1/outstanding': { customerId: 'cust-1', customerName: 'Anil Deshpande', billed: 610000, received: 300000, outstanding: 310000 },
      '/customers/cust-1': {
        id: 'cust-1',
        type: 'INDIVIDUAL',
        name: 'Anil Deshpande',
        phone: '+919822012345',
        alternatePhone: null,
        notes: null,
        gstBills: false,
        gstin: null,
        archivedAt: null,
        sites: [],
      },
    });
    await renderScreen(<CustomerScreen />);
    expect(await screen.findByText('₹3,100')).toBeTruthy();
    expect(screen.getByText('Billed ₹6,100 · Received ₹3,000')).toBeTruthy();
    await fireEvent.press(screen.getByText('New bill'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/bills/new', params: { customerId: 'cust-1' } });
  });
});
