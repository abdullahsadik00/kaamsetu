import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MultiChoiceChips } from '@/components/ui/choice-chips';
import { Icon } from '@/components/ui/icon';
import { TextField } from '@/components/ui/text-field';
import { colors, radius, space } from '@/theme/tokens';

import { rupees, toPaise, type FieldJob } from './data';
import { RadioList, Segmented, StepHeading } from './parts';

const WORK = ['CLEANED', 'GAS_FILLED', 'REPAIRED', 'PART_CHANGED', 'INSTALLED', 'CHECKED'] as const;
type Work = (typeof WORK)[number];
export type Outcome = 'COMPLETED' | 'NEEDS_FOLLOW_UP' | 'NOT_COMPLETED';
type Part = { name: string; qty: number };

export type FinishPayload = {
  outcome: Outcome;
  note?: string;
  work: { equipmentId: string; work: Work[] }[];
  parts: Part[];
  collected?: { amount: number; mode: 'CASH' | 'UPI' };
};

/** Parts the technician picks most (screen 29); any other name can be typed. */
const COMMON_PARTS = ['Gas R32', 'Gas R22', 'Capacitor', 'Drain pipe', 'Copper pipe', 'Remote', 'PCB', 'Stand'];

/**
 * Finish work as numbered steps (screen 28, T4.8, D-032): work on each AC,
 * parts, note, money, result. Saved as job.complete.
 */
export function FinishForm({ job, busy, onSave }: { job: FieldJob; busy: boolean; onSave: (payload: FinishPayload) => void }) {
  const { t } = useTranslation();
  const [outcome, setOutcome] = useState<Outcome>('COMPLETED');
  const [work, setWork] = useState<Record<string, Work[]>>({});
  const [parts, setParts] = useState<Part[]>([]);
  const [partSheet, setPartSheet] = useState(false);
  const [money, setMoney] = useState(job.amountToCollect ? String(job.amountToCollect / 100) : '');
  const [mode, setMode] = useState<'CASH' | 'UPI'>('CASH');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (outcome === 'NOT_COMPLETED' && !note.trim()) return setError(t('field.reasonNeeded'));
    const amount = toPaise(money);
    if (money.trim() && amount === null) return setError(t('field.badAmount'));
    setError(null);
    onSave({
      outcome,
      ...(note.trim() ? { note: note.trim() } : {}),
      work: Object.entries(work)
        .filter(([, w]) => w.length > 0)
        .map(([equipmentId, w]) => ({ equipmentId, work: w })),
      parts: parts
        .filter((p) => p.name.trim())
        .map((p) => ({ name: p.name.trim(), qty: Math.min(99, Math.max(1, Math.round(p.qty) || 1)) })),
      ...(amount ? { collected: { amount, mode } } : {}),
    });
  };

  const addPart = (name: string, qty: number) => {
    const i = parts.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
    setParts(i >= 0 ? parts.map((p, j) => (j === i ? { ...p, qty: Math.min(99, p.qty + qty) } : p)) : [...parts, { name, qty }]);
    setPartSheet(false);
  };
  const setQty = (i: number, qty: number) => setParts(parts.map((p, j) => (j === i ? { ...p, qty: Math.min(99, Math.max(1, qty)) } : p)));

  let step = 0;
  const equipment = job.equipment ?? [];

  return (
    <View style={styles.wrap}>
      {equipment.length > 0 ? (
        <View style={styles.section}>
          <StepHeading n={++step} title={t('uiField.stepWork')} />
          {equipment.map((e) => (
            <Card key={e.id}>
              <MultiChoiceChips
                label={[e.locationLabel, t(`customers.acTypes.${e.type}`), e.brand].filter(Boolean).join(' · ')}
                options={WORK.map((w) => ({ value: w, label: t(`field.work.${w}`) }))}
                value={work[e.id] ?? []}
                onChange={(v) => setWork({ ...work, [e.id]: v })}
              />
            </Card>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <StepHeading n={++step} title={t('uiField.stepParts')} hint={t('uiField.ifAny')} />
        {parts.length > 0 ? (
          <Card>
            {parts.map((p, i) => (
              <View key={`${p.name}-${i}`} style={[styles.partRow, i < parts.length - 1 && styles.divider]}>
                <AppText weight="semibold" style={styles.flex}>
                  {p.name}
                </AppText>
                <Stepper label={p.name} value={p.qty} onChange={(q) => setQty(i, q)} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('uiField.remove')} ${p.name}`}
                  onPress={() => setParts(parts.filter((_, j) => j !== i))}
                  style={styles.iconBtn}
                >
                  <Icon name="close" size={20} color={colors.muted} />
                </Pressable>
              </View>
            ))}
          </Card>
        ) : null}
        <Button variant="dashed" label={t('field.addPart')} onPress={() => setPartSheet(true)} />
      </View>

      <View style={styles.section}>
        <StepHeading n={++step} title={t('uiField.stepNote')} hint={outcome === 'NOT_COMPLETED' ? undefined : t('uiField.optional')} />
        <TextField label={outcome === 'NOT_COMPLETED' ? t('field.whyNot') : t('field.note')} value={note} onChangeText={setNote} multiline />
      </View>

      <View style={styles.section}>
        <StepHeading n={++step} title={t('uiField.stepMoney')} />
        <Card>
          {job.amountToCollect ? (
            <View style={styles.between}>
              <AppText color={colors.slate}>{t('uiField.collectFromCustomer')}</AppText>
              <AppText variant="section" weight="bold">
                ₹{rupees(job.amountToCollect)}
              </AppText>
            </View>
          ) : null}
          <Segmented
            label={t('field.how')}
            options={[
              { value: 'CASH', label: t('field.cash') },
              { value: 'UPI', label: t('field.upi') },
            ]}
            value={mode}
            onChange={setMode}
          />
          <TextField label={t('field.moneyTaken')} prefix="₹" keyboardType="decimal-pad" value={money} onChangeText={setMoney} />
        </Card>
      </View>

      <View style={styles.section}>
        <StepHeading n={++step} title={t('uiField.stepResult')} />
        <RadioList
          label={t('field.result')}
          options={[
            { value: 'COMPLETED', label: t('field.done') },
            { value: 'NEEDS_FOLLOW_UP', label: t('field.again') },
            { value: 'NOT_COMPLETED', label: t('field.couldnt') },
          ]}
          value={outcome}
          onChange={setOutcome}
        />
      </View>

      {error ? (
        <AppText color={colors.bad} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
      <Button label={t('field.saveFinish')} icon="check" size="large" onPress={submit} loading={busy} />

      <AddPartSheet visible={partSheet} onClose={() => setPartSheet(false)} onAdd={addPart} />
    </View>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} −`} onPress={() => onChange(value - 1)} style={styles.stepBtn}>
        <Icon name="minus" size={18} color={colors.tealTintText} />
      </Pressable>
      <AppText weight="semibold" style={styles.qty}>
        {value}
      </AppText>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} +`} onPress={() => onChange(value + 1)} style={styles.stepBtn}>
        <Icon name="plus" size={18} color={colors.tealTintText} />
      </Pressable>
    </View>
  );
}

/** Add part (screen 29): tap a common part, or type another with its quantity. */
function AddPartSheet({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (name: string, qty: number) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const addTyped = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), Math.min(99, Math.max(1, Number(qty) || 1)));
    setName('');
    setQty('1');
  };
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('uiField.addPart')}>
      <View>
        {COMMON_PARTS.map((p, i) => (
          <Pressable
            key={p}
            accessibilityRole="button"
            accessibilityLabel={`${t('uiField.add')} ${p}`}
            onPress={() => onAdd(p, 1)}
            style={[styles.partRow, i < COMMON_PARTS.length - 1 && styles.divider]}
          >
            <AppText weight="semibold" style={styles.flex}>
              {p}
            </AppText>
            <View style={styles.plus}>
              <Icon name="plus" color={colors.tealTintText} />
            </View>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        <View style={{ flex: 3 }}>
          <TextField label={t('field.part')} placeholder={t('uiField.otherPart')} value={name} onChangeText={setName} />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label={t('field.qty')} value={qty} keyboardType="number-pad" onChangeText={setQty} />
        </View>
      </View>
      <Button variant="secondary" label={t('uiField.add')} onPress={addTyped} disabled={!name.trim()} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xl },
  section: { gap: space.md },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space.sm },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  partRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.rowLine },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  stepBtn: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  qty: { minWidth: 24, textAlign: 'center' },
  plus: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
});
