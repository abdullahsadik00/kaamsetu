import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card, SectionLabel } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { colors, space } from '@/theme/tokens';

import { useEmployees, type Employee } from './api';

/** Owner: everyone in the business (screen 63), with whether their login is linked (D-025). */
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
  const add = () => router.push('/employees/new');
  const addButton = <Button icon="plus" label={t('employees.add')} onPress={add} />;
  if (list.data.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="account-hard-hat-outline"
          title={t('uiPeople.employeesEmptyTitle')}
          body={t('uiPeople.employeesEmptyBody')}
          action={addButton}
        />
      </Screen>
    );
  }

  const active = list.data.filter((e) => e.status === 'ACTIVE');
  const removed = list.data.filter((e) => e.status !== 'ACTIVE');

  const group = (people: Employee[]) => (
    <Card style={styles.list}>
      {people.map((e, i) => {
        const status =
          e.status !== 'ACTIVE'
            ? { label: t('employees.removed'), color: colors.muted }
            : e.loginLinked
              ? { label: t('employees.linked'), color: colors.tealTintText }
              : { label: t('employees.notLinked'), color: colors.muted };
        return (
          <ListRow
            key={e.id}
            avatar={e.user.name || e.user.phone || '?'}
            title={e.user.name || e.user.phone || ''}
            subtitle={t(`roles.${e.role}`)}
            divider={i < people.length - 1}
            right={
              <View style={styles.right}>
                <AppText variant="small" weight="semibold" color={status.color}>
                  {status.label}
                </AppText>
                <Icon name="chevron-right" color={colors.muted} />
              </View>
            }
            onPress={() => router.push({ pathname: '/employees/[id]', params: { id: e.id } })}
          />
        );
      })}
    </Card>
  );

  return (
    <Screen footer={addButton}>
      <SectionLabel>{t('uiPeople.activeStaff', { count: active.length })}</SectionLabel>
      {active.length ? group(active) : null}
      {removed.length ? (
        <>
          <SectionLabel>{t('uiPeople.removedStaff', { count: removed.length })}</SectionLabel>
          {group(removed)}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: space.xs, gap: 0 },
  right: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
