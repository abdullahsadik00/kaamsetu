import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Placeholder } from '@/components/ui/placeholder';
import { Screen } from '@/components/ui/screen';
import { colors, radius, space, touch } from '@/theme/tokens';

import { useEmployees } from './api';

/** Owner: everyone in the business, with whether their login is linked (D-025). */
export function EmployeesScreen() {
  const { t } = useTranslation();
  const list = useQuery(useEmployees());

  if (list.isPending) return <ActivityIndicator style={{ flex: 1 }} color={colors.teal} />;
  if (list.isError) {
    return (
      <Screen>
        <AppText color={colors.bad}>{errorMessage(t, list.error)}</AppText>
        <Button variant="secondary" label={t('common.retry')} onPress={() => list.refetch()} />
      </Screen>
    );
  }
  if (list.data.length === 0) return <Placeholder title={t('employees.empty')} body="" />;

  return (
    <Screen>
      {list.data.map((e) => (
        <Pressable
          key={e.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/employees/[id]', params: { id: e.id } })}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <AppText weight="semibold">{e.user.name || e.user.phone}</AppText>
            <AppText variant="support" color={colors.slate}>
              {t(`roles.${e.role}`)}
            </AppText>
          </View>
          <View style={[styles.chip, e.loginLinked ? styles.chipOk : styles.chipWait]}>
            <AppText variant="small" weight="semibold" color={e.loginLinked ? colors.ok : colors.warn}>
              {e.loginLinked ? t('employees.linked') : t('employees.notLinked')}
            </AppText>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touch.action + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chip: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.sm },
  chipOk: { backgroundColor: colors.okTint },
  chipWait: { backgroundColor: colors.warnTint },
});
