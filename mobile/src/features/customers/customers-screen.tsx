import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { PendingSaves } from '@/features/sync/pending-saves';
import { colors, space } from '@/theme/tokens';

import { displayPhone, useCustomers } from './api';
import { SearchBox } from './people-ui';

/** Customers tab (screen 43): find a repeat customer fast by name or last digits of the mobile (T4.3). */
export function CustomersScreen() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const query = useDeferredValue(q.trim());
  const [archived, setArchived] = useState(false);
  const list = useQuery(useCustomers(query, archived));
  const add = () => router.push('/customers/new');

  return (
    <Screen footer={<Button label={t('customers.add')} icon="plus" onPress={add} />}>
      <SearchBox
        label={t('customers.search')}
        placeholder={t('uiPeople.searchPlaceholder')}
        value={q}
        onChangeText={setQ}
      />
      <PendingSaves only={['customer.create', 'equipment.create']} />
      {archived ? <AppText variant="section">{t('customers.archivedTitle')}</AppText> : null}
      {list.isPending ? <ActivityIndicator color={colors.teal} /> : null}
      {list.isError ? (
        <View style={{ gap: space.sm }}>
          <AppText color={colors.bad}>{errorMessage(t, list.error)}</AppText>
          <Button variant="secondary" label={t('common.retry')} onPress={() => list.refetch()} />
        </View>
      ) : null}
      {list.data?.length === 0 && archived ? (
        <AppText color={colors.slate}>{t('customers.noArchived')}</AppText>
      ) : list.data?.length === 0 ? (
        query ? (
          <EmptyState
            icon="account-search-outline"
            title={t('customers.noneFound')}
            body={t('uiPeople.noneFoundBody')}
            action={<Button icon="plus" label={t('uiPeople.addAsNew')} onPress={add} />}
          />
        ) : (
          <EmptyState icon="account-group-outline" title={t('customers.empty')} body={t('uiPeople.emptyCustomersBody')} />
        )
      ) : null}
      {list.data?.length ? (
        <Card style={{ paddingVertical: space.xs, gap: 0 }}>
          {list.data.map((c, i) => (
            <ListRow
              key={c.id}
              avatar={c.name}
              title={c.name}
              subtitle={[displayPhone(c.phone), c.place, t('customers.acCount', { count: c.acCount })]
                .filter(Boolean)
                .join(' · ')}
              right={c.archivedAt ? <AppText variant="small" color={colors.muted}>{t('customers.archived')}</AppText> : undefined}
              divider={i < list.data.length - 1}
              onPress={() => router.push({ pathname: '/customers/[id]', params: { id: c.id } })}
            />
          ))}
        </Card>
      ) : null}
      {list.isSuccess ? (
        <Button
          variant="text"
          label={archived ? t('customers.showActive') : t('customers.showArchived')}
          onPress={() => setArchived(!archived)}
        />
      ) : null}
    </Screen>
  );
}
