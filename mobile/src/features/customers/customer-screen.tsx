import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, SectionLabel } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { colors, radius, space } from '@/theme/tokens';

import {
  acSummary,
  archiveEquipment,
  CUSTOMERS_KEY,
  displayPhone,
  updateCustomer,
  useCustomer,
  type Equipment,
} from './api';
import { ConfirmSheet, ContactButtons } from './people-ui';

/** Customer page (screen 44): call/WhatsApp, addresses with their ACs, add AC or address, edit, archive. */
export function CustomerScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const customer = useQuery(useCustomer(id));
  const [removing, setRemoving] = useState<Equipment | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: CUSTOMERS_KEY });
  const archive = useMutation({
    mutationFn: (archived: boolean) => updateCustomer(id, { archived }),
    onSuccess: refresh,
  });
  const removeAc = useMutation({
    mutationFn: archiveEquipment,
    onSuccess: () => {
      setRemoving(null);
      void refresh();
    },
  });

  if (customer.isPending) return <ActivityIndicator style={{ flex: 1 }} color={colors.teal} />;
  if (customer.isError) {
    return (
      <Screen>
        <AppText color={colors.bad}>{errorMessage(t, customer.error)}</AppText>
      </Screen>
    );
  }
  const c = customer.data;

  return (
    <Screen>
      <Stack.Screen options={{ title: c.name }} />
      <Card>
        <AppText variant="title">{c.name}</AppText>
        <AppText color={colors.slate}>{displayPhone(c.phone)}</AppText>
        <View style={styles.badges}>
          <Badge
            tone={c.gstBills ? 'teal' : 'grey'}
            label={c.gstBills ? t('uiPeople.gstOn') : t('uiPeople.gstOff')}
          />
          {c.archivedAt ? <Badge tone="grey" icon="archive-outline" label={t('customers.archived')} /> : null}
        </View>
        {c.notes ? (
          <AppText variant="support" color={colors.slate}>
            {c.notes}
          </AppText>
        ) : null}
        <ContactButtons phone={c.phone} />
        <Button
          icon="plus"
          label={t('jobs.new')}
          onPress={() => router.push({ pathname: '/jobs/new', params: { customerId: id } })}
        />
      </Card>

      {c.sites.map((s) => (
        <Card key={s.id}>
          <SectionLabel>
            {s.label || t('customers.address')}
            {s.isDefault ? ` · ${t('customers.main')}` : ''}
          </SectionLabel>
          <AppText weight="semibold">{[s.addressLine1, s.locality, s.city].filter(Boolean).join(', ')}</AppText>
          {s.landmark ? (
            <AppText variant="support" color={colors.slate}>
              {t('customers.landmark')}: {s.landmark}
            </AppText>
          ) : null}
          {s.equipment.length === 0 ? (
            <AppText variant="support" color={colors.muted}>
              {t('customers.noAcs')}
            </AppText>
          ) : (
            s.equipment.map((e) => (
              <View key={e.id} style={styles.ac}>
                <View style={styles.acIcon}>
                  <Icon name={e.type === 'CASSETTE' ? 'snowflake' : 'fan'} color={colors.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText weight="semibold">{e.locationLabel || t('customers.ac')}</AppText>
                  <AppText variant="small" color={colors.slate}>
                    {acSummary(e, t(`customers.acTypes.${e.type}`))}
                  </AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('customers.removeAc')} ${e.locationLabel || t('customers.ac')}`}
                  onPress={() => setRemoving(e)}
                  hitSlop={8}
                  style={styles.removeBtn}
                >
                  <Icon name="trash-can-outline" size={20} color={colors.muted} />
                </Pressable>
              </View>
            ))
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/customers/[id]/ac', params: { id, siteId: s.id } })}
            style={({ pressed }) => [styles.addAc, pressed && { backgroundColor: colors.tealTint }]}
          >
            <Icon name="plus-circle-outline" size={20} color={colors.tealTintText} />
            <AppText variant="support" weight="semibold" color={colors.tealTintText}>
              {t('customers.addAcHere')}
            </AppText>
          </Pressable>
        </Card>
      ))}

      <Button
        variant="dashed"
        icon="plus"
        label={t('customers.addAddress')}
        onPress={() => router.push({ pathname: '/customers/[id]/site', params: { id } })}
      />
      <Button
        variant="secondary"
        icon="pencil-outline"
        label={t('customers.edit')}
        onPress={() => router.push({ pathname: '/customers/[id]/edit', params: { id } })}
      />
      <Button
        variant="text"
        icon={c.archivedAt ? 'archive-arrow-up-outline' : 'archive-outline'}
        label={c.archivedAt ? t('customers.unarchive') : t('customers.archive')}
        onPress={() => archive.mutate(!c.archivedAt)}
        loading={archive.isPending}
      />
      {archive.error ? <AppText color={colors.bad}>{errorMessage(t, archive.error)}</AppText> : null}

      <ConfirmSheet
        visible={removing !== null}
        title={t('customers.removeAcTitle')}
        body={
          removing
            ? `${removing.locationLabel || t('customers.ac')} · ${acSummary(removing, t(`customers.acTypes.${removing.type}`))}\n${t('uiPeople.removeAcBody')}${removeAc.error ? `\n\n${errorMessage(t, removeAc.error)}` : ''}`
            : ''
        }
        confirmLabel={t('customers.removeAc')}
        onConfirm={() => removing && removeAc.mutate(removing.id)}
        onClose={() => {
          setRemoving(null);
          removeAc.reset();
        }}
        loading={removeAc.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  ac: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.xs,
  },
  acIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.tealTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  addAc: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
    paddingHorizontal: space.xs,
  },
});
