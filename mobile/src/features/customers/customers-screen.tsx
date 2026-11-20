import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { colors, radius, space, touch } from '@/theme/tokens';

import { displayPhone, useCustomers } from './api';

/** Customers tab: find a repeat customer fast by name or last digits of the mobile (T4.3). */
export function CustomersScreen() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const query = useDeferredValue(q.trim());
  const list = useQuery(useCustomers(query));

  return (
    <Screen
      footer={<Button label={t('customers.add')} onPress={() => router.push('/customers/new')} />}
    >
      <TextField
        label={t('customers.search')}
        placeholder={t('customers.searchHint')}
        value={q}
        onChangeText={setQ}
        autoCorrect={false}
        returnKeyType="search"
      />
      {list.isPending ? <ActivityIndicator color={colors.teal} /> : null}
      {list.isError ? (
        <View style={{ gap: space.sm }}>
          <AppText color={colors.bad}>{errorMessage(t, list.error)}</AppText>
          <Button variant="secondary" label={t('common.retry')} onPress={() => list.refetch()} />
        </View>
      ) : null}
      {list.data?.length === 0 ? (
        <AppText color={colors.slate}>{query ? t('customers.noneFound') : t('customers.empty')}</AppText>
      ) : null}
      {list.data?.map((c) => (
        <Pressable
          key={c.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/customers/[id]', params: { id: c.id } })}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <AppText weight="semibold">{c.name}</AppText>
            <AppText variant="support" color={colors.slate}>
              {[displayPhone(c.phone), c.place].filter(Boolean).join(' · ')}
            </AppText>
          </View>
          <AppText variant="support" color={colors.slate}>
            {t('customers.acCount', { count: c.acCount })}
          </AppText>
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
});
