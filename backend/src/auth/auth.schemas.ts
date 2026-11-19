import { z } from 'zod';
import { normalizeIndianMobile } from './phone.js';

const IndianMobile = z
  .string()
  .max(20)
  .refine((v) => normalizeIndianMobile(v) !== null, {
    message: 'Enter a 10-digit Indian mobile number',
  })
  .transform((v) => normalizeIndianMobile(v) as string);

export const RequestOtpSchema = z.strictObject({ phone: IndianMobile });
export type RequestOtp = z.infer<typeof RequestOtpSchema>;

export const VerifyOtpSchema = z.strictObject({
  phone: IndianMobile,
  code: z.string().regex(/^\d{6}$/, 'The code has 6 digits'),
  device: z.strictObject({
    platform: z.enum(['android', 'ios', 'web']),
    label: z.string().trim().max(60).optional(),
  }),
});
export type VerifyOtp = z.infer<typeof VerifyOtpSchema>;

export const RefreshSchema = z.strictObject({
  refreshToken: z.string().min(20).max(200),
});
export type Refresh = z.infer<typeof RefreshSchema>;
