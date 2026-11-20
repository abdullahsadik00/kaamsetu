import { z } from 'zod';
import { IndianMobile } from '../auth/auth.schemas.js';

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional();
const gstin = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .pipe(z.string().regex(GSTIN, 'GSTIN should look like 27ABCDE1234F1Z5'))
  .nullable()
  .optional();

export const SiteSchema = z.strictObject({
  label: optText(40),
  addressLine1: z.string().trim().min(3, 'Enter the address').max(200),
  locality: optText(80),
  city: optText(60),
  landmark: optText(120),
});
export type SiteInput = z.infer<typeof SiteSchema>;

/** New customer with their first address (becomes the default site, T4.3). */
export const CreateCustomerSchema = z.strictObject({
  type: z.enum(['INDIVIDUAL', 'BUSINESS']).default('INDIVIDUAL'),
  name: z.string().trim().min(2, 'Enter a name').max(80),
  phone: IndianMobile,
  alternatePhone: IndianMobile.nullable().optional(),
  notes: optText(500),
  gstBills: z.boolean().default(false),
  gstin,
  site: SiteSchema,
  /** Set after the app showed the "already a customer" warning and the owner chose "Add anyway". */
  allowDuplicatePhone: z.boolean().default(false),
});
export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = z
  .strictObject({
    type: z.enum(['INDIVIDUAL', 'BUSINESS']),
    name: z.string().trim().min(2).max(80),
    phone: IndianMobile,
    alternatePhone: IndianMobile.nullable(),
    notes: optText(500),
    gstBills: z.boolean(),
    gstin,
    archived: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to change' });
export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>;

export const ListCustomersSchema = z.strictObject({
  /** Name, or any part of the mobile number (e.g. last 4 digits). */
  q: z.string().trim().max(60).optional(),
  archived: z.enum(['true', 'false']).optional(),
});
export type ListCustomers = z.infer<typeof ListCustomersSchema>;

const EquipmentFields = {
  type: z.enum(['SPLIT', 'WINDOW', 'CASSETTE', 'DUCTABLE', 'TOWER', 'OTHER']),
  brand: optText(40),
  /** Tons, 0.5–20, one decimal (1.5). Null = not known. */
  capacityTons: z.number().min(0.5).max(20).multipleOf(0.25).nullable().optional(),
  locationLabel: optText(40),
  model: optText(60),
  serialNumber: optText(60),
  refrigerant: optText(20),
};

export const CreateEquipmentSchema = z.strictObject({
  customerId: z.uuid(),
  siteId: z.uuid(),
  ...EquipmentFields,
  type: EquipmentFields.type.default('SPLIT'),
});
export type CreateEquipment = z.infer<typeof CreateEquipmentSchema>;

export const UpdateEquipmentSchema = z
  .strictObject({ ...EquipmentFields, archived: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to change' });
export type UpdateEquipment = z.infer<typeof UpdateEquipmentSchema>;
