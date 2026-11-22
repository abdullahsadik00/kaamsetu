import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { useLanguage } from '@/localization/i18n';
import { fontFamily } from '@/theme/fonts';
import { colors, fontSize, radius, space, touch } from '@/theme/tokens';

/** White card with a title, hint and a switch (GST bills, team in use). */
export function SwitchCard({
  title,
  hint,
  value,
  onChange,
}: {
  title: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.switchCard}>
      <View style={styles.flex}>
        <AppText weight="semibold">{title}</AppText>
        {hint ? (
          <AppText variant="support" color={colors.slate}>
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.teal, false: colors.line2 }}
        thumbColor={colors.white}
      />
    </View>
  );
}

/** Confirm dialog as a bottom sheet (screen 66): Cancel + a red action. */
export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
  loading,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button variant="secondary" label={t('common.cancel')} onPress={onClose} />
          </View>
          <View style={styles.flex}>
            <Button variant="destructive" label={confirmLabel} onPress={onConfirm} loading={loading} />
          </View>
        </View>
      }
    >
      <AppText color={colors.slate}>{body}</AppText>
    </BottomSheet>
  );
}

/** Call + WhatsApp secondary buttons for an E.164 phone; `extra` sits at the end of the row. */
export function ContactButtons({ phone, extra }: { phone: string; extra?: ReactNode }) {
  const { t } = useTranslation();
  const digits = phone.replace(/\D/g, '');
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Button variant="secondary" icon="phone-outline" label={t('customers.call')} onPress={() => Linking.openURL(`tel:${phone}`)} />
      </View>
      <View style={styles.flex}>
        <Button
          variant="secondary"
          icon="whatsapp"
          label={t('uiPeople.whatsapp')}
          onPress={() => Linking.openURL(`https://wa.me/${digits}`)}
        />
      </View>
      {extra ? <View style={styles.flex}>{extra}</View> : null}
    </View>
  );
}

/** Grey search box with a magnifier and a clear button (screens 43, 80). */
export function SearchBox({
  value,
  onChangeText,
  label,
  placeholder,
}: {
  value: string;
  onChangeText: (v: string) => void;
  label: string;
  placeholder: string;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  return (
    <View style={[styles.search, value ? styles.searchOn : null]}>
      <Icon name="magnify" color={colors.slate} />
      <TextInput
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        returnKeyType="search"
        style={[styles.searchInput, { fontFamily: fontFamily(language, 'regular') }]}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('uiPeople.clearSearch')} onPress={() => onChangeText('')} hitSlop={8}>
          <Icon name="close-circle-outline" color={colors.slate} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Two big side-by-side options with icons (customer type: Home / Business). */
export function SegmentToggle<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; icon: IconName }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="support" weight="semibold">
        {label}
      </AppText>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => onChange(o.value)}
              style={[styles.segment, on && styles.segmentOn]}
            >
              <Icon name={o.icon} size={20} color={on ? colors.white : colors.ink} />
              <AppText weight="semibold" color={on ? colors.white : colors.ink}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space.sm },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  search: {
    minHeight: touch.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: colors.soft,
  },
  searchOn: { backgroundColor: colors.surface, borderColor: colors.teal },
  searchInput: { flex: 1, fontSize: fontSize.body, color: colors.ink, paddingVertical: space.sm },
  segment: {
    flex: 1,
    minHeight: touch.action,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  segmentOn: { backgroundColor: colors.teal, borderColor: colors.teal },
});
