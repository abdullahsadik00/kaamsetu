import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { TextField } from '@/components/ui/text-field';
import { colors, space, tones } from '@/theme/tokens';

import type { Status } from './data';
import { ActionRow, RadioList } from './parts';
import type { UpdateKind } from './update-sheets';

export type HoldSide = 'CUSTOMER' | 'OURS';

/** Update status (screen 22): only the moves the phone can save offline. */
export function UpdateStatusSheet({
  visible,
  onClose,
  subtitle,
  status,
  onStart,
  onFinish,
  onHold,
  onUpdate,
}: {
  visible: boolean;
  onClose: () => void;
  subtitle: string;
  status: Status;
  onStart: () => void;
  onFinish: () => void;
  onHold: (side: HoldSide) => void;
  /** Appointment fixed / Part needed / Note for owner (T4.7). */
  onUpdate: (kind: UpdateKind) => void;
}) {
  const { t } = useTranslation();
  const canStart = status === 'ASSIGNED' || status === 'ON_HOLD';
  const working = status === 'IN_PROGRESS';
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('uiField.updateStatus')} subtitle={subtitle}>
      {canStart || working ? <SectionLabel>{t('uiField.workProgress')}</SectionLabel> : null}
      {canStart ? (
        <ActionRow icon="play-outline" tone={tones.warn} title={t('uiField.startedWork')} sub={t('uiField.startedWorkSub')} onPress={onStart} />
      ) : null}
      {working ? (
        <ActionRow
          icon="check-circle-outline"
          tone={tones.ok}
          title={t('uiField.workCompleted')}
          sub={t('uiField.workCompletedSub')}
          onPress={onFinish}
        />
      ) : null}
      {status !== 'COMPLETED' && status !== 'CANCELLED' ? (
        <>
          <SectionLabel>{t('uiField.problem')}</SectionLabel>
          <ActionRow icon="pause" tone={tones.grey} title={t('uiField.notReady')} sub={t('uiField.notReadySub')} onPress={() => onHold('CUSTOMER')} />
          <ActionRow
            icon="alert-outline"
            tone={tones.orange}
            title={t('uiField.cantContinue')}
            sub={t('uiField.cantContinueSub')}
            onPress={() => onHold('OURS')}
          />
          <SectionLabel>{t('uiUpdates.other')}</SectionLabel>
          <ActionRow
            icon="calendar-check-outline"
            tone={tones.teal}
            title={t('uiUpdates.appointment')}
            sub={t('uiUpdates.appointmentSub')}
            onPress={() => onUpdate('appointment')}
          />
          <ActionRow
            icon="package-variant-closed"
            tone={tones.orange}
            title={t('uiUpdates.part')}
            sub={t('uiUpdates.partSub')}
            onPress={() => onUpdate('part')}
          />
          <ActionRow icon="note-text-outline" tone={tones.info} title={t('uiUpdates.note')} sub={t('uiUpdates.noteSub')} onPress={() => onUpdate('note')} />
        </>
      ) : null}
      <View style={styles.note}>
        <Icon name="bell-outline" size={16} color={colors.muted} />
        <AppText variant="small" color={colors.muted}>
          {t('uiField.ownerSees')}
        </AppText>
      </View>
    </BottomSheet>
  );
}

const REASONS: Record<HoldSide, string[]> = {
  CUSTOMER: ['rNotHome', 'rComeLater', 'rSaidNo', 'rNotAnswering', 'rPayment', 'rSociety'],
  OURS: ['rTool', 'rSecondPerson', 'rBigger', 'rTime', 'rVehicle'],
};

/** Customer not ready / Can't continue (screens 25, 26): saved as job.hold `{side, reason?}`. */
export function HoldSheet({
  side,
  onClose,
  name,
  busy,
  onSave,
}: {
  side: HoldSide | null;
  onClose: () => void;
  name: string;
  busy: boolean;
  onSave: (payload: { side: HoldSide; reason?: string }) => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const s = side ?? 'CUSTOMER';
  const close = () => {
    setReason(null);
    setNote('');
    onClose();
  };
  const save = () => {
    const text = [reason ? t(`uiField.${reason}`) : null, note.trim() || null].filter(Boolean).join(' · ');
    onSave({ side: s, ...(text ? { reason: text } : {}) });
    setReason(null);
    setNote('');
  };
  return (
    <BottomSheet
      visible={side !== null}
      onClose={close}
      title={s === 'CUSTOMER' ? t('uiField.notReady') : t('uiField.cantContinue')}
      subtitle={`${name} · ${s === 'CUSTOMER' ? t('uiField.notReadySub') : t('uiField.cantContinueSub')}`}
      footer={<Button label={t('field.save')} icon="pause" size="large" onPress={save} loading={busy} />}
    >
      <SectionLabel>{t('uiField.why')}</SectionLabel>
      <RadioList
        label={t('uiField.why')}
        options={REASONS[s].map((r) => ({ value: r, label: t(`uiField.${r}`) }))}
        value={reason}
        onChange={setReason}
      />
      <TextField label={t('field.note')} value={note} onChangeText={setNote} multiline />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, paddingTop: space.sm },
});
