import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/features/auth/session';
import { colors, radius, space } from '@/theme/tokens';

import { createInvite, deactivateEmployee, resetLogin, useEmployee, EMPLOYEES_KEY } from './api';

/** Owner: one employee. Show an invite QR to link their Google login, or reset it. */
export function EmployeeScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useSession((s) => s.profile?.membership?.memberId);
  const qc = useQueryClient();
  const employee = useQuery(useEmployee(id));
  const invite = useMutation({ mutationFn: () => createInvite(id) });
  const reset = useMutation({
    mutationFn: () => resetLogin(id),
    onSuccess: () => {
      invite.reset();
      void qc.invalidateQueries({ queryKey: EMPLOYEES_KEY });
    },
  });

  const remove = useMutation({
    mutationFn: () => deactivateEmployee(id),
    onSuccess: () => {
      invite.reset();
      void qc.invalidateQueries({ queryKey: EMPLOYEES_KEY });
    },
  });

  if (employee.isPending) return <ActivityIndicator style={{ flex: 1 }} color={colors.teal} />;
  if (employee.isError) {
    return (
      <Screen>
        <AppText color={colors.bad}>{errorMessage(t, employee.error)}</AppText>
      </Screen>
    );
  }
  const e = employee.data;
  const name = e.user.name || e.user.phone || '';
  const isMe = e.id === me;
  const removed = e.status !== 'ACTIVE';
  const until = invite.data
    ? new Date(invite.data.expiresAt).toLocaleString(i18n.language === 'en' ? 'en-IN' : `${i18n.language}-IN`, {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  const confirmRemove = () =>
    Alert.alert(t('employees.removeTitle'), t('employees.removeBody', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('employees.remove'), style: 'destructive', onPress: () => remove.mutate() },
    ]);

  const confirmReset = () =>
    Alert.alert(t('employees.resetTitle'), t('employees.resetBody', { name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('employees.resetLogin'), style: 'destructive', onPress: () => reset.mutate() },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: name }} />
      <View style={styles.card}>
        <AppText variant="section">{name}</AppText>
        <AppText color={colors.slate}>{t(`roles.${e.role}`)}</AppText>
        {e.user.phone ? <AppText color={colors.slate}>{e.user.phone.replace(/^\+91/, '+91 ')}</AppText> : null}
        {removed ? (
          <AppText weight="semibold" color={colors.muted}>
            {t('employees.removed')}
          </AppText>
        ) : (
          <AppText weight="semibold" color={e.loginLinked ? colors.ok : colors.warn}>
            {e.loginLinked ? t('employees.linked') : t('employees.notLinked')}
          </AppText>
        )}
      </View>

      {invite.data ? (
        <View style={[styles.card, { alignItems: 'center' }]}>
          <AppText variant="support" color={colors.slate} style={{ textAlign: 'center' }}>
            {t('employees.inviteHint', { name, time: until })}
          </AppText>
          <View style={styles.qr}>
            <QRCode value={invite.data.qr} size={220} color={colors.ink} backgroundColor={colors.white} />
          </View>
          <AppText variant="support" color={colors.slate}>
            {t('employees.orCode')}
          </AppText>
          <AppText variant="title" style={{ letterSpacing: 6 }} selectable>
            {invite.data.code}
          </AppText>
        </View>
      ) : null}

      {!isMe && !removed ? (
        <Button
          label={invite.data ? t('employees.newInvite') : t('employees.invite')}
          variant={invite.data ? 'secondary' : 'primary'}
          onPress={() => invite.mutate()}
          loading={invite.isPending}
        />
      ) : null}
      {!isMe && !removed && e.loginLinked ? (
        <Button variant="text" label={t('employees.resetLogin')} onPress={confirmReset} loading={reset.isPending} />
      ) : null}
      {reset.isSuccess ? <AppText color={colors.ok}>{t('employees.resetDone')}</AppText> : null}
      {!isMe && !removed && e.role !== 'OWNER' ? (
        <Button
          variant="text"
          label={t('employees.remove')}
          onPress={confirmRemove}
          loading={remove.isPending}
        />
      ) : null}
      {removed ? (
        <AppText variant="support" color={colors.slate}>
          {t('employees.removedHint')}
        </AppText>
      ) : null}
      {invite.error || reset.error || remove.error ? (
        <AppText color={colors.bad}>{errorMessage(t, invite.error ?? reset.error ?? remove.error)}</AppText>
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
  qr: { padding: space.md, backgroundColor: colors.white, borderRadius: radius.md },
});
