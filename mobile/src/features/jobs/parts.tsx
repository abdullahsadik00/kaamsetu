import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { colors, radius, space } from '@/theme/tokens';

type Option<T extends string> = { value: T; label: string; icon?: IconName };

/** Section heading with a grey hint on the right (Stitch "Which AC? · Tick all that need work"). */
export function FormSection({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.labelRow}>
        <AppText weight="semibold">{label}</AppText>
        {hint ? (
          <AppText variant="small" color={colors.muted} style={styles.hint}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

type ChipsProps<T extends string> = {
  label: string;
  options: Option<T>[];
  /** Equal-width chips in a grid (day / time rows). */
  grid?: boolean;
} & ({ multi?: false; value: T | null; onChange: (v: T) => void } | { multi: true; value: T[]; onChange: (v: T[]) => void });

/** Selectable chips with a check mark when on (Stitch screen 09). */
export function OptionChips<T extends string>(props: ChipsProps<T>) {
  const { label, options, grid } = props;
  const isOn = (v: T) => (props.multi ? props.value.includes(v) : props.value === v);
  const press = (v: T) => {
    if (props.multi) props.onChange(isOn(v) ? props.value.filter((x) => x !== v) : [...props.value, v]);
    else props.onChange(v);
  };
  return (
    <View style={styles.row} accessibilityRole={props.multi ? undefined : 'radiogroup'} accessibilityLabel={label}>
      {options.map((o) => {
        const on = isOn(o.value);
        return (
          <Pressable
            key={o.value}
            accessibilityRole={props.multi ? 'checkbox' : 'radio'}
            accessibilityState={{ checked: on }}
            onPress={() => press(o.value)}
            style={({ pressed }) => [styles.chip, grid && styles.gridChip, on && styles.chipOn, pressed && !on && styles.chipPressed]}
          >
            {on ? <Icon name="check" size={16} color={colors.tealTintText} /> : o.icon ? <Icon name={o.icon} size={16} color={colors.slate} /> : null}
            <AppText variant="support" weight="semibold" color={on ? colors.tealTintText : colors.ink}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Pill filter chips in one scrollable row (Stitch screen 05: All · Today · …). */
export function FilterChips<T extends string>({
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            style={[styles.filter, on && styles.filterOn]}
          >
            <AppText variant="support" weight="semibold" color={on ? colors.tealTintText : colors.ink}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** One plain row in an action sheet (Stitch screen 17). */
export function SheetRow({ label, onPress, danger, icon }: { label: string; onPress: () => void; danger?: boolean; icon?: IconName }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.sheetRow, pressed && styles.chipPressed]}
    >
      {icon ? <Icon name={icon} color={danger ? colors.bad : colors.slate} /> : null}
      <AppText color={danger ? colors.bad : colors.ink}>{label}</AppText>
    </Pressable>
  );
}

/** Centered confirm dialog (Stitch screen 18): title, body, text button + red button. */
export function ConfirmDialog({
  visible,
  title,
  body,
  children,
  keepLabel,
  confirmLabel,
  onKeep,
  onConfirm,
  confirmDisabled,
  busy,
}: {
  visible: boolean;
  title: string;
  body: string;
  children?: ReactNode;
  keepLabel: string;
  confirmLabel: string;
  onKeep: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  busy?: boolean;
}) {
  const off = confirmDisabled || busy;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeep} statusBarTranslucent>
      <View style={styles.dim}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <AppText variant="section">{title}</AppText>
          <AppText color={colors.slate}>{body}</AppText>
          {children}
          <View style={styles.dialogActions}>
            <Pressable accessibilityRole="button" onPress={onKeep} style={styles.dialogBtn}>
              <AppText weight="semibold" color={colors.slate}>
                {keepLabel}
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: off, busy }}
              disabled={off}
              onPress={onConfirm}
              style={({ pressed }) => [styles.dialogBtn, styles.dangerBtn, pressed && { opacity: 0.85 }, off && styles.dangerOff]}
            >
              <AppText weight="semibold" color={colors.white}>
                {confirmLabel}
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.sm },
  hint: { flexShrink: 1, textAlign: 'right' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: colors.surface,
  },
  gridChip: { flexGrow: 1, flexBasis: '30%' },
  chipOn: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  chipPressed: { backgroundColor: colors.soft },
  filters: { gap: space.sm, paddingRight: space.lg },
  filter: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: colors.surface,
  },
  filterOn: { backgroundColor: colors.tealTint, borderColor: colors.teal },
  sheetRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.rowLine,
  },
  dim: { flex: 1, backgroundColor: 'rgba(20,33,61,0.45)', justifyContent: 'center', padding: space.lg },
  dialog: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.xl, gap: space.md },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm, marginTop: space.sm },
  dialogBtn: { minHeight: 48, paddingHorizontal: space.lg, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  dangerBtn: { backgroundColor: colors.bad },
  dangerOff: { opacity: 0.5 },
});
