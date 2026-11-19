/**
 * Indian mobile numbers only for now (docs/10 §1). Accepts the ways people
 * type them ("98765 01234", "098765-01234", "+91 98765 01234") and returns
 * E.164 ("+919876501234"), or null when it is not a valid Indian mobile.
 */
export function normalizeIndianMobile(input: string): string | null {
  const compact = input.replace(/[\s\-()]/g, '');
  const m = compact.match(/^(?:\+91|91|0)?([6-9]\d{9})$/);
  return m ? `+91${m[1]}` : null;
}
