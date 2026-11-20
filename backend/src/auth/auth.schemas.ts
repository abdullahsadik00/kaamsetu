import { z } from 'zod';
import { normalizeIndianMobile } from './phone.js';

export const IndianMobile = z
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

const Device = z.strictObject({
  platform: z.enum(['android', 'ios', 'web']),
  label: z.string().trim().max(60).optional(),
});

export const GoogleLoginSchema = z.strictObject({
  idToken: z.string().min(20).max(4096),
  device: Device,
});
export type GoogleLogin = z.infer<typeof GoogleLoginSchema>;

/** QR token, or the fallback: the employee's phone + the 6-digit code. */
export const AcceptInviteSchema = z.union([
  z.strictObject({ token: z.string().min(20).max(100) }),
  z.strictObject({
    phone: IndianMobile,
    code: z.string().regex(/^\d{6}$/, 'The code has 6 digits'),
  }),
]);
export type AcceptInvite = z.infer<typeof AcceptInviteSchema>;

/** "Delete my account": the app sends this only after the user confirms. */
export const DeleteAccountSchema = z.strictObject({ confirm: z.literal(true) });
export type DeleteAccount = z.infer<typeof DeleteAccountSchema>;

export const RefreshSchema = z.strictObject({
  refreshToken: z.string().min(20).max(200),
});
export type Refresh = z.infer<typeof RefreshSchema>;
