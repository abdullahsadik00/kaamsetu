import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { TFunction } from 'i18next';

import { displayPhone } from '@/features/customers/api';

import { longDate, rupees, type Bill } from './api';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * A4 HTML for a bill or quotation (D-034). Only what the server saved is
 * printed: lines, discount, GST per rate (provisional, Q-04), payments.
 */
export function invoiceHtml(t: TFunction, b: Bill): string {
  const isBill = b.kind === 'BILL';
  const address = b.site ? [b.site.addressLine1, b.site.locality, b.site.city].filter(Boolean).join(', ') : '';
  const paid = b.payments.filter((p) => !p.voidedAt).reduce((s, p) => s + p.amount, 0);
  const rows = b.items
    .map(
      (i, n) => `<tr><td>${n + 1}</td><td>${esc(i.description)}${b.gstBill && i.gstRate ? `<br><small>${esc(t('uiBilling.gstRate', { rate: i.gstRate }))}</small>` : ''}</td>
<td class="r">${i.qty}</td><td class="r">${rupees(i.unitPrice)}</td><td class="r">${rupees(i.amount)}</td></tr>`,
    )
    .join('');
  const sum = (label: string, value: string, strong = false) =>
    `<tr${strong ? ' class="strong"' : ''}><td>${esc(label)}</td><td class="r">${value}</td></tr>`;
  const totals = [
    sum(t('uiBilling.subtotal'), rupees(b.subtotal)),
    b.discount ? sum(t('uiBilling.discount'), `−${rupees(b.discount)}`) : '',
    ...b.gst.flatMap((g) => [
      sum(t('uiBilling.cgst', { rate: g.rate / 2 }), rupees(g.cgst)),
      sum(t('uiBilling.sgst', { rate: g.rate / 2 }), rupees(g.sgst)),
    ]),
    sum(isBill ? t('uiBilling.billTotal') : t('uiBilling.total'), rupees(b.total), true),
    isBill && b.status === 'ISSUED' ? sum(t('uiBilling.pdfPaid'), rupees(paid)) : '',
    isBill && b.status === 'ISSUED' ? sum(t('uiBilling.pdfBalance'), rupees(Math.max(b.total - paid, 0)), true) : '',
  ].join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { margin: 24px; }
  body { font-family: 'Noto Sans', 'Noto Sans Devanagari', sans-serif; color: #14213D; font-size: 13px; }
  .head { display: flex; justify-content: space-between; border-bottom: 2px solid #0F766E; padding-bottom: 8px; }
  h1 { margin: 0; font-size: 20px; color: #0F766E; }
  h2 { margin: 0; font-size: 16px; letter-spacing: 1px; }
  .muted { color: #5B6576; }
  .to { margin: 16px 0; }
  table { width: 100%; border-collapse: collapse; }
  .items th { text-align: left; border-bottom: 1px solid #CFCABE; padding: 6px 4px; font-size: 12px; color: #4A5468; }
  .items td { border-bottom: 1px solid #EEEAE1; padding: 6px 4px; vertical-align: top; }
  .r { text-align: right; }
  .sum { width: 55%; margin-left: auto; margin-top: 12px; }
  .sum td { padding: 4px; }
  .strong td { font-weight: bold; border-top: 1px solid #CFCABE; }
  .foot { margin-top: 24px; }
</style></head><body>
<div class="head">
  <div><h1>${esc(b.business.name)}</h1><div class="muted">${esc(displayPhone(b.business.phone))}</div>
  ${b.gstBill && b.sellerGstin ? `<div class="muted">GSTIN ${esc(b.sellerGstin)}</div>` : ''}</div>
  <div class="r"><h2>${esc(isBill ? t('uiBilling.pdfBill') : t('uiBilling.pdfQuote'))}</h2>
  <div>${esc(t('uiBilling.pdfNo'))} ${esc(b.number)}</div><div>${esc(longDate(b.billDate))}</div>
  ${b.jobNumber ? `<div class="muted">${esc(t('uiBilling.jobRef', { n: b.jobNumber }))}</div>` : ''}</div>
</div>
<div class="to"><div class="muted">${esc(t('uiBilling.pdfTo'))}</div>
  <strong>${esc(b.customerName)}</strong>
  ${b.customer ? `<div>${esc(displayPhone(b.customer.phone))}</div>` : ''}
  ${address ? `<div>${esc(address)}</div>` : ''}
  ${b.gstBill && b.buyerGstin ? `<div>GSTIN ${esc(b.buyerGstin)}</div>` : ''}
</div>
<table class="items"><thead><tr><th>#</th><th>${esc(t('uiBilling.pdfItem'))}</th><th class="r">${esc(t('uiBilling.pdfQty'))}</th>
<th class="r">${esc(t('uiBilling.pdfRate'))}</th><th class="r">${esc(t('uiBilling.amount'))}</th></tr></thead><tbody>${rows}</tbody></table>
<table class="sum"><tbody>${totals}</tbody></table>
<div class="foot muted">${isBill ? '' : `${esc(t('uiBilling.pdfQuoteNote'))}<br>`}${esc(t('uiBilling.pdfThanks'))}</div>
</body></html>`;
}

/** Makes the PDF and opens the system share sheet (WhatsApp is one of the choices). */
export async function shareInvoicePdf(t: TFunction, b: Bill): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: invoiceHtml(t, b), width: 595, height: 842 });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: b.kind === 'BILL' ? t('uiBilling.billTitle', { number: b.number }) : t('uiBilling.quoteTitle', { number: b.number }),
  });
}
