import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Badge, STATUS_TONE } from '@/components/ui/badge';
import { Icon, type IconName } from '@/components/ui/icon';
import { colors, radius, space, touch } from '@/theme/tokens';

import type { FieldJob, Status } from './data';

/** Read-only job status pill. */
export function StatusBadge({ status }: { status: Status }) {
  const { t } = useTranslation();
  return <Badge label={t(`jobs.status.${status}`)} tone={STATUS_TONE[status] ?? 'grey'} />;
}

/** "Kothrud · Service · 2 AC" */
export function jobSummary(t: TFunction, job: FieldJob, withLocality = true): string {
  const n = job.equipment?.length ?? 0;
  return [withLocality ? job.locality : null, t(`jobs.types.${job.type}`), n > 0 ? t('uiField.acs', { count: n }) : null]
    .filter(Boolean)
    .join(' · ');
}

export function slotLabel(t: TFunction, job: FieldJob): string | null {
  return job.timeSlot ? t(`jobs.slots.${job.timeSlot}`) : null;
}

/** Numbered step heading on the finish page (screen 28). */
export function StepHeading({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNo}>
        <AppText variant="small" weight="bold" color={colors.white}>
          {n}
        </AppText>
      </View>
      <AppText variant="section" style={styles.flex}>
        {title}
        {hint ? (
          <AppText variant="support" color={colors.muted}>
            {'  '}
            {hint}
          </AppText>
        ) : null}
      </AppText>
    </View>
  );
}

type Option<T extends string> = { value: T; label: string };

/** Radio-style list of full-width rows (screens 25, 26, 28 result). */
export function RadioList<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            style={[styles.radioRow, on && styles.radioRowOn]}
          >
            <AppText weight={on ? 'semibold' : 'regular'} color={on ? colors.tealTintText : colors.ink} style={styles.flex}>
              {o.label}
            </AppText>
            <Icon name={on ? 'radiobox-marked' : 'radiobox-blank'} color={on ? colors.teal : colors.line2} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Two or three equal buttons, one selected (Cash / UPI). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segRow} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            style={[styles.seg, on && styles.segOn]}
          >
            <AppText weight="semibold" color={on ? colors.white : colors.ink}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Row in the Update status sheet (screen 22): tinted icon, title, sub, chevron. */
export function ActionRow({
  icon,
  tone,
  title,
  sub,
  onPress,
}: {
  icon: IconName;
  tone: { text: string; fill: string };
  title: string;
  sub: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${sub}`}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
    >
      <View style={[styles.actionIcon, { backgroundColor: tone.fill }]}>
        <Icon name={icon} color={tone.text} />
      </View>
      <View style={styles.flex}>
        <AppText weight="semibold">{title}</AppText>
        <AppText variant="support" color={colors.slate}>
          {sub}
        </AppText>
      </View>
      <Icon name="chevron-right" color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepNo: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  list: { gap: space.sm },
  radioRow: {
    minHeight: touch.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  radioRowOn: { backgroundColor: colors.tealTint, borderColor: colors.teal, borderWidth: 1.5 },
  segRow: { flexDirection: 'row', gap: space.sm },
  seg: {
    flex: 1,
    minHeight: touch.min,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.soft,
  },
  segOn: { backgroundColor: colors.teal },
  action: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  actionPressed: { backgroundColor: colors.tealTint },
  actionIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
