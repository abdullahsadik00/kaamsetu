import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/ui/card';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { TextField } from '@/components/ui/text-field';
import { dayString } from '@/features/jobs/jobs';
import { useLanguage } from '@/localization/i18n';
import { space } from '@/theme/tokens';

import { shortDate } from './data';
import { COMMON_PARTS, Stepper } from './finish-form';
import { RadioList, Segmented } from './parts';

export type UpdateKind = 'appointment' | 'part' | 'note';
export type Slot = 'MORNING' | 'AFTERNOON' | 'EVENING';
export type AppointmentPayload = { date: string; slot: Slot };
export type PartPayload = { part: string; qty: number; canContinue: boolean; note?: string };
export type NotePayload = { text: string };

const SLOTS: Slot[] = ['MORNING', 'AFTERNOON', 'EVENING'];
const OTHER = '__other';

/** Appointment fixed (screen 23): saved as job.appointment `{date, slot}`; moves the job's day. */
export function AppointmentSheet({
  visible,
  onClose,
  name,
  busy,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  name: string;
  busy: boolean;
  onSave: (payload: AppointmentPayload) => void;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const [date, setDate] = useState(dayString(0));
  const [slot, setSlot] = useState<Slot | null>(null);
  const days = [
    { value: dayString(0), label: t('uiUpdates.today') },
    { value: dayString(1), label: t('uiUpdates.tomorrow') },
    { value: dayString(2), label: shortDate(dayString(2), language) },
  ];
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('uiUpdates.appointment')}
      subtitle={`${name} · ${t('uiUpdates.appointmentSub')}`}
      footer={
        <Button
          label={t('uiUpdates.save')}
          icon="calendar-check-outline"
          size="large"
          disabled={!slot}
          loading={busy}
          onPress={() => slot && onSave({ date, slot })}
        />
      }
    >
      <ChoiceChips label={t('uiUpdates.day')} options={days} value={date} onChange={setDate} />
      <ChoiceChips
        label={t('uiUpdates.time')}
        options={SLOTS.map((s) => ({ value: s, label: t(`jobs.slots.${s}`) }))}
        value={slot}
        onChange={setSlot}
      />
    </BottomSheet>
  );
}

/** Part needed (screen 24): saved as job.part; the job's status does not change. */
export function PartSheet({
  visible,
  onClose,
  name,
  busy,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  name: string;
  busy: boolean;
  onSave: (payload: PartPayload) => void;
}) {
  const { t } = useTranslation();
  const [pick, setPick] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [qty, setQty] = useState(1);
  const [go, setGo] = useState<'yes' | 'no'>('yes');
  const [note, setNote] = useState('');
  const part = pick === OTHER ? typed.trim() : (pick ?? '');
  const save = () => {
    if (!part) return;
    onSave({ part, qty, canContinue: go === 'yes', ...(note.trim() ? { note: note.trim() } : {}) });
    setPick(null);
    setTyped('');
    setQty(1);
    setGo('yes');
    setNote('');
  };
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('uiUpdates.part')}
      subtitle={`${name} · ${t('uiUpdates.partSub')}`}
      footer={<Button label={t('uiUpdates.askOwner')} icon="package-variant-closed" size="large" disabled={!part} loading={busy} onPress={save} />}
    >
      <SectionLabel>{t('uiUpdates.whichPart')}</SectionLabel>
      <RadioList
        label={t('uiUpdates.whichPart')}
        options={[...COMMON_PARTS.map((p) => ({ value: p, label: p })), { value: OTHER, label: t('uiUpdates.otherPart') }]}
        value={pick}
        onChange={setPick}
      />
      {pick === OTHER ? <TextField label={t('uiUpdates.partName')} value={typed} onChangeText={setTyped} /> : null}
      <View style={styles.between}>
        <AppText weight="semibold">{t('uiUpdates.howMany')}</AppText>
        <Stepper label={t('uiUpdates.howMany')} value={qty} onChange={(v) => setQty(Math.min(99, Math.max(1, v)))} />
      </View>
      <SectionLabel>{t('uiUpdates.canContinue')}</SectionLabel>
      <Segmented
        label={t('uiUpdates.canContinue')}
        options={[
          { value: 'yes' as const, label: t('uiUpdates.yesContinue') },
          { value: 'no' as const, label: t('uiUpdates.noStopped') },
        ]}
        value={go}
        onChange={setGo}
      />
      <TextField label={t('uiUpdates.partNote')} value={note} onChangeText={setNote} multiline />
    </BottomSheet>
  );
}

const QUICK = ['q1', 'q2', 'q3', 'q4', 'q5'];

/** Note for owner (screen 27): saved as job.note `{text}`; no status change. */
export function NoteSheet({
  visible,
  onClose,
  name,
  busy,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  name: string;
  busy: boolean;
  onSave: (payload: NotePayload) => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const save = () => {
    if (!text.trim()) return;
    onSave({ text: text.trim() });
    setText('');
  };
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('uiUpdates.note')}
      subtitle={`${name} · ${t('uiUpdates.noteSub')}`}
      footer={<Button label={t('uiUpdates.save')} icon="send" size="large" disabled={!text.trim()} loading={busy} onPress={save} />}
    >
      <ChoiceChips
        label={t('uiUpdates.note')}
        options={QUICK.map((q) => ({ value: t(`uiUpdates.${q}`), label: t(`uiUpdates.${q}`) }))}
        value={null}
        onChange={(q) => setText(text.trim() ? `${text.trim()} · ${q}` : q)}
      />
      <TextField label={t('uiUpdates.note')} placeholder={t('uiUpdates.notePlaceholder')} value={text} onChangeText={setText} multiline />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
});
