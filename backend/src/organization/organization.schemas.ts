import { z } from 'zod';
import { IndianMobile } from '../auth/auth.schemas.js';

/** GSTIN: 2-digit state code, PAN (10), entity number, 'Z', checksum. */
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** "Your business" (T4.1, prototype onboarding step 1). */
export const CreateOrganizationSchema = z.strictObject({
  name: z.string().trim().min(2, 'Enter your business name').max(80),
  ownerName: z.string().trim().min(2, 'Enter your name').max(60),
  /** Business mobile; also becomes the owner's number if they have none. */
  phone: IndianMobile,
  city: z.string().trim().max(60).optional(),
  gstBills: z.boolean().default(false),
  gstin: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(GSTIN, 'GSTIN should look like 27ABCDE1234F1Z5'))
    .optional(),
});
export type CreateOrganization = z.infer<typeof CreateOrganizationSchema>;

/** Owner adds a senior technician or helper (D-027); they join by invite QR (D-025). */
export const CreateEmployeeSchema = z.strictObject({
  name: z.string().trim().min(2, 'Enter a name').max(60),
  phone: IndianMobile,
  role: z.enum(['SENIOR_TECHNICIAN', 'HELPER']),
});
export type CreateEmployee = z.infer<typeof CreateEmployeeSchema>;
