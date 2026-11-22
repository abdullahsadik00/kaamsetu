import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { CreateCustomerSchema, type CreateCustomer } from './customers.schemas.js';

/**
 * Loads a business's existing customers from a spreadsheet saved as CSV
 * (T6.2 pilot data entry). One row per customer; the same checks as the
 * app's customer form. Used by `npm run pilot -- import-customers`.
 *
 * Columns (header row, any order, case and spaces ignored):
 *   name, phone (required), address (required), alternate phone, locality,
 *   city, landmark, notes, gstin, ac count, ac brand, ac tons
 */
export type ImportRow = {
  line: number;
  customer: CreateCustomer;
  acs: { count: number; brand: string | null; capacityTons: number | null };
};
export type RowError = { line: number; message: string };

/** Header spellings people use, mapped to one field name. */
const COLUMNS: Record<string, string> = {
  name: 'name',
  customer: 'name',
  customer_name: 'name',
  phone: 'phone',
  mobile: 'phone',
  mobile_number: 'phone',
  phone_number: 'phone',
  alternate_phone: 'alternatePhone',
  alt_phone: 'alternatePhone',
  other_phone: 'alternatePhone',
  address: 'address',
  address_line_1: 'address',
  locality: 'locality',
  area: 'locality',
  city: 'city',
  landmark: 'landmark',
  notes: 'notes',
  gstin: 'gstin',
  gst_number: 'gstin',
  ac_count: 'acCount',
  acs: 'acCount',
  number_of_acs: 'acCount',
  ac_brand: 'acBrand',
  brand: 'acBrand',
  ac_tons: 'acTons',
  tons: 'acTons',
  ac_ton: 'acTons',
};
const MAX_ACS_PER_ROW = 20;

/** RFC 4180 CSV: quoted fields may hold commas, quotes ("") and new lines. Excel's BOM is dropped. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows.filter((r) => r.some((f) => f.trim()));
}

const key = (header: string) =>
  header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

/**
 * Checks every row. Line numbers are spreadsheet rows (the header is 1), so
 * the owner can find and fix them. Nothing is saved here.
 */
export function readCustomerRows(text: string): { rows: ImportRow[]; errors: RowError[] } {
  const [header, ...body] = parseCsv(text);
  const errors: RowError[] = [];
  if (!header) return { rows: [], errors: [{ line: 1, message: 'The file is empty' }] };
  const fields = header.map((h) => COLUMNS[key(h)]);
  const unknown = header.filter((h, i) => h.trim() && !fields[i]);
  if (unknown.length) errors.push({ line: 1, message: `Unknown column(s): ${unknown.join(', ')}` });
  for (const need of ['name', 'phone', 'address']) {
    if (!fields.includes(need)) errors.push({ line: 1, message: `Missing column: ${need}` });
  }
  if (errors.length) return { rows: [], errors };

  const rows: ImportRow[] = [];
  body.forEach((cells, i) => {
    const line = i + 2;
    const v: Record<string, string> = {};
    fields.forEach((f, j) => {
      if (f) v[f] = (cells[j] ?? '').trim();
    });
    const parsed = CreateCustomerSchema.safeParse({
      name: v.name,
      phone: v.phone,
      alternatePhone: v.alternatePhone || null,
      notes: v.notes,
      gstin: v.gstin || null,
      gstBills: Boolean(v.gstin),
      site: { addressLine1: v.address, locality: v.locality, city: v.city, landmark: v.landmark },
    });
    const problems = parsed.success
      ? []
      : parsed.error.issues.map((e) => `${e.path.join('.') || 'row'}: ${e.message}`);

    const tons = v.acTons ? Number.parseFloat(v.acTons) : null;
    if (tons !== null && !(tons >= 0.5 && tons <= 20 && Number.isInteger(tons * 4))) {
      problems.push(`ac tons: "${v.acTons}" should be like 1, 1.5 or 2`);
    }
    const brand = v.acBrand ? v.acBrand.slice(0, 40) : null;
    let count = v.acCount ? Number(v.acCount) : brand || tons ? 1 : 0;
    if (!Number.isInteger(count) || count < 0 || count > MAX_ACS_PER_ROW) {
      problems.push(`ac count: "${v.acCount}" should be a whole number up to ${MAX_ACS_PER_ROW}`);
      count = 0;
    }
    if (problems.length || !parsed.success) {
      errors.push({ line, message: problems.join('; ') });
      return;
    }
    rows.push({ line, customer: parsed.data, acs: { count, brand, capacityTons: tons } });
  });
  return { rows, errors };
}

/**
 * Saves the rows in one transaction. A phone already saved for a customer of
 * this business, or seen earlier in the file, is skipped (re-running the same
 * file adds nothing twice). Writes one audit row in the owner's name.
 */
export async function importCustomers(
  db: PrismaClient,
  organizationId: string,
  actorUserId: string,
  rows: ImportRow[],
) {
  const existing = await db.customer.findMany({
    where: { organizationId, archivedAt: null, phone: { in: rows.map((r) => r.customer.phone) } },
    select: { phone: true, name: true },
  });
  const seen = new Map(existing.map((c) => [c.phone, c.name]));
  const skipped: { line: number; phone: string; savedAs: string }[] = [];
  const customers: Prisma.CustomerCreateManyInput[] = [];
  const sites: Prisma.SiteCreateManyInput[] = [];
  const acs: Prisma.EquipmentCreateManyInput[] = [];
  for (const { line, customer: c, acs: ac } of rows) {
    const dup = seen.get(c.phone);
    if (dup) {
      skipped.push({ line, phone: c.phone, savedAs: dup });
      continue;
    }
    seen.set(c.phone, c.name);
    const id = randomUUID();
    const siteId = randomUUID();
    customers.push({
      id,
      organizationId,
      type: c.type,
      name: c.name,
      phone: c.phone,
      alternatePhone: c.alternatePhone ?? null,
      notes: c.notes ?? null,
      gstBills: c.gstBills,
      gstin: c.gstin ?? null,
    });
    sites.push({
      id: siteId,
      organizationId,
      customerId: id,
      isDefault: true,
      addressLine1: c.site.addressLine1,
      locality: c.site.locality ?? null,
      city: c.site.city ?? null,
      landmark: c.site.landmark ?? null,
    });
    for (let n = 1; n <= ac.count; n++) {
      acs.push({
        organizationId,
        customerId: id,
        siteId,
        brand: ac.brand,
        capacityTons: ac.capacityTons,
        locationLabel: ac.count > 1 ? `AC ${n}` : null,
      });
    }
  }
  if (customers.length) {
    await db.$transaction(
      async (tx) => {
        await tx.customer.createMany({ data: customers });
        await tx.site.createMany({ data: sites });
        if (acs.length) await tx.equipment.createMany({ data: acs });
        await tx.auditLog.create({
          data: {
            organizationId,
            actorUserId,
            action: 'CUSTOMERS_IMPORTED',
            entityType: 'Organization',
            entityId: organizationId,
            metadata: { customers: customers.length, acs: acs.length, skipped: skipped.length },
          },
        });
      },
      { timeout: 60_000 },
    );
  }
  return { added: customers.length, acs: acs.length, skipped };
}
