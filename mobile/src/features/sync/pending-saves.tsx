import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card, SectionLabel } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { colors, space } from '@/theme/tokens';

import type { OutboxOperation } from './outbox';
import { dismissSave, usePendingSaves, type OwnerOp } from './owner-offline';

const ICON: Record<OwnerOp, IconName> = {
  'customer.create': 'account-plus-outline',
  'equipment.create': 'fan',
  'enquiry.create': 'message-text-outline',
  'job.create': 'briefcase-outline',
};
const LABEL: Record<OwnerOp, string> = {
  'customer.create': 'uiOwner.pendCustomer',
  'equipment.create': 'uiOwner.pendAc',
  'enquiry.create': 'uiOwner.pendEnquiry',
  'job.create': 'uiOwner.pendJob',
};

/** What a waiting save is about, from what was typed (names come from the payload). */
function detail(op: OutboxOperation): string | null {
  const p = (op.payload ?? {}) as { name?: string; locationLabel?: string; scheduledDate?: string; preferredDate?: string };
  return p.name ?? p.locationLabel ?? p.scheduledDate ?? p.preferredDate ?? null;
}

/**
 * The owner's saves made without internet that the server has not accepted
 * yet (D-021, docs/09 §2): "Will reach the team when your phone is online".
 * A refused one shows why, with "OK, got it". Hidden when there are none.
 */
export function PendingSaves({ only }: { only?: OwnerOp[] }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const pending = usePendingSaves();
  const ops = (pending.data ?? []).filter((o) => !only || only.includes(o.operation as OwnerOp));
  if (ops.length === 0) return null;
  return (
    <Card tone="recessed">
      <SectionLabel>{t('uiOwner.waitingToSend', { count: ops.length })}</SectionLabel>
      <AppText variant="small" color={colors.slate}>
        {t('uiOwner.waitingHint')}
      </AppText>
      {ops.map((o) => {
        const refused = o.state === 'NEEDS_ATTENTION';
        const kind = o.operation as OwnerOp;
        return (
          <View key={o.id} style={styles.row}>
            <Icon name={ICON[kind] ?? 'cloud-upload-outline'} size={20} color={refused ? colors.bad : colors.teal} />
            <View style={styles.flex}>
              <AppText weight="semibold">{[t(LABEL[kind]), detail(o)].filter(Boolean).join(' · ')}</AppText>
              <AppText variant="small" color={refused ? colors.bad : colors.muted}>
                {refused ? `${t('uiOwner.refusedSave')}${o.lastErrorCode ? ` (${o.lastErrorCode})` : ''}` : t('sync.saved')}
              </AppText>
            </View>
            {refused ? <Button variant="text" label={t('sync.gotIt')} onPress={() => void dismissSave(qc, o)} /> : null}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
});
