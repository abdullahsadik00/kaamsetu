/** Splits a hold note saved by the sync endpoint ("Our side: reason", "Customer side: reason"). */
export function holdSide(note: string | null): { side: 'OURS' | 'CUSTOMER' | null; reason: string | null } {
  if (!note) return { side: null, reason: null };
  for (const [prefix, side] of [
    ['Our side', 'OURS'],
    ['Customer side', 'CUSTOMER'],
  ] as const) {
    if (note === prefix) return { side, reason: null };
    if (note.startsWith(`${prefix}: `)) return { side, reason: note.slice(prefix.length + 2) || null };
  }
  return { side: null, reason: note };
}
