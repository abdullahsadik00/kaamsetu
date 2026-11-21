import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { useSession } from '@/features/auth/session';
import { ConfirmSheet, ContactButtons } from '@/features/customers/people-ui';
import { colors, radius, space } from '@/theme/tokens';

import { createInvite, deactivateEmployee, resetLogin, useEmployee, EMPLOYEES_KEY } from './api';

/** Owner: one employee (screens 65, 66). Show an invite QR to link their Google login, or reset it. */
export function EmployeeScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useSession((s) => s.profile?.membership?.memberId);
  const qc = useQueryClient();
  const employee = useQuery(useEmployee(id));
  const [confirm, setConfirm] = useState<'reset' | 'remove' | null>(null);
  const invite = useMutation({ mutationFn: () => createInvite(id) });
  const reset = useMutation({
    mutationFn: () => resetLogin(id),
    onSuccess: () => {
      setConfirm(null);
      invite.reset();
      void qc.invalidateQueries({ queryKey: EMPLOYEES_KEY });
    },
  });

  const remove = useMutation({
    mutationFn: () => deactivateEmployee(id),
    onSuccess: () => {
      setConfirm(null);
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
  const canInvite = !isMe && !removed;
  const error = invite.error ?? reset.error ?? remove.error;

  return (
    <Screen>
      <Stack.Screen options={{ title: name }} />
      <Card>
        <View style={styles.who}>
          <Avatar name={name} size={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="section">{name}</AppText>
            <AppText variant="support" color={colors.slate}>
              {t(`roles.${e.role}`)}
            </AppText>
            {e.user.phone ? (
              <AppText variant="support" color={colors.slate}>
                {e.user.phone.replace(/^\+91/, '+91 ')}
              </AppText>
            ) : null}
          </View>
        </View>
        {removed ? (
          <Badge tone="grey" icon="account-off-outline" label={t('employees.removed')} />
        ) : (
          <Badge
            tone={e.loginLinked ? 'ok' : 'grey'}
            icon={e.loginLinked ? 'check-circle-outline' : 'circle-medium'}
            label={e.loginLinked ? t('employees.linked') : t('employees.notLinked')}
          />
        )}
        {e.user.phone && !isMe ? <ContactButtons phone={e.user.phone} /> : null}
        {canInvite && !invite.data ? (
          <Button icon="qrcode" label={t('employees.invite')} onPress={() => invite.mutate()} loading={invite.isPending} />
        ) : null}
      </Card>

      {invite.data ? (
        <Card style={styles.qrCard}>
          <View style={styles.qr}>
            <QRCode value={invite.data.qr} size={220} color={colors.ink} backgroundColor={colors.white} />
          </View>
          <AppText style={styles.center}>{t('employees.inviteHint', { name, time: until })}</AppText>
          <AppText variant="support" color={colors.slate} style={styles.center}>
            {t('employees.orCode')}
          </AppText>
          <AppText variant="title" style={styles.code} selectable>
            {invite.data.code}
          </AppText>
          {canInvite ? (
            <Button
              variant="text"
              icon="refresh"
              label={t('employees.newInvite')}
              onPress={() => invite.mutate()}
              loading={invite.isPending}
            />
          ) : null}
        </Card>
      ) : null}

      {reset.isSuccess ? (
        <Card tone="recessed">
          <AppText color={colors.ok}>{t('employees.resetDone')}</AppText>
        </Card>
      ) : null}
      {canInvite && e.loginLinked ? (
        <Button
          variant="destructive"
          icon="restore"
          label={t('employees.resetLogin')}
          onPress={() => setConfirm('reset')}
        />
      ) : null}
      {canInvite && e.role !== 'OWNER' ? (
        <Button
          variant="text"
          icon="account-remove-outline"
          label={t('employees.remove')}
          onPress={() => setConfirm('remove')}
        />
      ) : null}
      {removed ? (
        <AppText variant="support" color={colors.slate}>
          {t('employees.removedHint')}
        </AppText>
      ) : null}
      {error && !confirm ? <AppText color={colors.bad}>{errorMessage(t, error)}</AppText> : null}

      <ConfirmSheet
        visible={confirm === 'reset'}
        title={t('employees.resetTitle')}
        body={`${t('employees.resetBody', { name })}${reset.error ? `\n\n${errorMessage(t, reset.error)}` : ''}`}
        confirmLabel={t('employees.resetLogin')}
        onConfirm={() => reset.mutate()}
        onClose={() => setConfirm(null)}
        loading={reset.isPending}
      />
      <ConfirmSheet
        visible={confirm === 'remove'}
        title={t('employees.removeTitle')}
        body={`${t('employees.removeBody', { name })}${remove.error ? `\n\n${errorMessage(t, remove.error)}` : ''}`}
        confirmLabel={t('employees.remove')}
        onConfirm={() => remove.mutate()}
        onClose={() => setConfirm(null)}
        loading={remove.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  who: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  qrCard: { alignItems: 'center', gap: space.md },
  qr: {
    padding: space.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rowLine,
  },
  center: { textAlign: 'center' },
  code: { letterSpacing: 6, fontVariant: ['tabular-nums'] },
});
