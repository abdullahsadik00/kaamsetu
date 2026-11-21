import { router } from 'expo-router';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ApiError, errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { colors, space } from '@/theme/tokens';

import { badgeFor, longDate, rupees, type BillRow } from './api';

/** Billing error codes have their own text (uiBilling.err_*); anything else uses the app's. */
export function billingError(t: TFunction, error: unknown): string {
  if (error instanceof ApiError) {
    const key = `uiBilling.err_${error.code}`;
    const text = t(key);
    if (text !== key) return text;
  }
  return errorMessage(t, error);
}

/** Opens a bill or quotation page. */
export const openInvoice = (r: Pick<BillRow, 'kind' | 'id'>) =>
  router.push({ pathname: r.kind === 'BILL' ? '/bills/[id]' : '/quotations/[id]', params: { id: r.id } });

/** Label on the left, money on the right (totals block). */
export function MoneyRow({
  label,
  value,
  strong,
  color,
}: {
  label: string;
  value: string;
  strong?: boolean;
  color?: string;
}) {
  return (
    <View style={styles.between}>
      <AppText variant={strong ? 'body' : 'support'} weight={strong ? 'semibold' : 'regular'} color={color ?? (strong ? colors.ink : colors.slate)} style={styles.flex}>
        {label}
      </AppText>
      <AppText variant={strong ? 'section' : 'body'} weight={strong ? 'bold' : 'semibold'} color={color}>
        {value}
      </AppText>
    </View>
  );
}

/** One bill or quotation in a list (Stitch 33/42): customer, number · date · GST, total and badge. */
export function InvoiceCard({ row: r }: { row: BillRow }) {
  const { t } = useTranslation();
  const badge = badgeFor(r);
  const amount = r.kind === 'BILL' && r.status === 'ISSUED' && r.remaining > 0 && r.paid > 0 ? r.remaining : r.total;
  return (
    <Card onPress={() => openInvoice(r)} accessibilityLabel={`${r.customerName}, ${r.number}, ${rupees(amount)}, ${t(badge.key)}`}>
      <View style={styles.between}>
        <AppText variant="section" numberOfLines={1} style={styles.flex}>
          {r.customerName}
        </AppText>
        <AppText variant="section" weight="bold">
          {rupees(amount)}
        </AppText>
      </View>
      <View style={styles.between}>
        <AppText variant="support" color={colors.slate} style={styles.flex}>
          {[r.number, longDate(r.billDate), r.gstBill ? t('uiBilling.gst') : null].filter(Boolean).join(' · ')}
        </AppText>
        <Badge label={t(badge.key)} tone={badge.tone} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
});
