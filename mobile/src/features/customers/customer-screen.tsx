import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
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

/** Customer page: call/WhatsApp, addresses with their ACs, add AC or address, edit, archive. */
export function CustomerScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const customer = useQuery(useCustomer(id));
  const refresh = () => qc.invalidateQueries({ queryKey: CUSTOMERS_KEY });
  const archive = useMutation({
    mutationFn: (archived: boolean) => updateCustomer(id, { archived }),
    onSuccess: refresh,
  });
  const removeAc = useMutation({ mutationFn: archiveEquipment, onSuccess: refresh });

  if (customer.isPending) return <ActivityIndicator style={{ flex: 1 }} color={colors.teal} />;
  if (customer.isError) {
    return (
      <Screen>
        <AppText color={colors.bad}>{errorMessage(t, customer.error)}</AppText>
      </Screen>
    );
  }
  const c = customer.data;
  const digits = c.phone.replace(/^\+/, '');

  const confirmRemoveAc = (e: Equipment) =>
    Alert.alert(t('customers.removeAcTitle'), acSummary(e, t(`customers.acTypes.${e.type}`)), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('customers.removeAc'), style: 'destructive', onPress: () => removeAc.mutate(e.id) },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: c.name }} />
      <View style={styles.card}>
        <AppText variant="section">{c.name}</AppText>
        <AppText color={colors.slate}>{displayPhone(c.phone)}</AppText>
        {c.notes ? <AppText variant="support">{c.notes}</AppText> : null}
        {c.archivedAt ? (
          <AppText weight="semibold" color={colors.muted}>
            {t('customers.archived')}
          </AppText>
        ) : null}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" label={t('customers.call')} onPress={() => Linking.openURL(`tel:${c.phone}`)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              label="WhatsApp"
              onPress={() => Linking.openURL(`https://wa.me/${digits}`)}
            />
          </View>
        </View>
      </View>

      {c.sites.map((s) => (
        <View key={s.id} style={styles.card}>
          <AppText weight="semibold">
            {s.label || t('customers.address')}
            {s.isDefault ? ` · ${t('customers.main')}` : ''}
          </AppText>
          <AppText color={colors.slate}>
            {[s.addressLine1, s.locality, s.city].filter(Boolean).join(', ')}
          </AppText>
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
                <View style={{ flex: 1 }}>
                  <AppText weight="semibold">{e.locationLabel || t('customers.ac')}</AppText>
                  <AppText variant="support" color={colors.slate}>
                    {acSummary(e, t(`customers.acTypes.${e.type}`))}
                  </AppText>
                </View>
                <Button variant="text" label={t('customers.removeAc')} onPress={() => confirmRemoveAc(e)} />
              </View>
            ))
          )}
          <Button
            variant="text"
            label={t('customers.addAcHere')}
            onPress={() => router.push({ pathname: '/customers/[id]/ac', params: { id, siteId: s.id } })}
          />
        </View>
      ))}

      <Button
        variant="secondary"
        label={t('customers.addAddress')}
        onPress={() => router.push({ pathname: '/customers/[id]/site', params: { id } })}
      />
      <Button
        variant="secondary"
        label={t('customers.edit')}
        onPress={() => router.push({ pathname: '/customers/[id]/edit', params: { id } })}
      />
      <Button
        variant="text"
        label={c.archivedAt ? t('customers.unarchive') : t('customers.archive')}
        onPress={() => archive.mutate(!c.archivedAt)}
        loading={archive.isPending}
      />
      {archive.error || removeAc.error ? (
        <AppText color={colors.bad}>{errorMessage(t, archive.error ?? removeAc.error)}</AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.sm,
  },
  row: { flexDirection: 'row', gap: space.sm },
  ac: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
