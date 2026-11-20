import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { LanguagePicker } from '@/components/ui/language-picker';
import { deleteAccount, logout, useSession } from '@/features/auth/session';
import { unsentCount } from '@/features/sync/sync-engine';
import { colors, radius, space } from '@/theme/tokens';

/** Who is logged in, language switch, and log out. Shared by every role. */
export function ProfileSection() {
  const { t } = useTranslation();
  const profile = useSession((s) => s.profile);
  const out = useMutation({ mutationFn: logout });
  const remove = useMutation({ mutationFn: deleteAccount });

  const onLogout = async () => {
    // Logging out deletes the phone's database, so warn about work not yet sent.
    const count = await unsentCount();
    if (count === 0) return out.mutate();
    Alert.alert(t('profile.logoutTitle'), t('profile.logoutUnsent', { count }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logoutConfirm'), style: 'destructive', onPress: () => out.mutate() },
    ]);
  };

  const role = profile?.membership?.role;
  const onDelete = () =>
    Alert.alert(
      t('profile.deleteTitle'),
      role === 'OWNER' ? t('profile.deleteBodyOwner') : t('profile.deleteBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('profile.deleteConfirm'), style: 'destructive', onPress: () => remove.mutate() },
      ],
    );
  const phone = profile?.user.phone?.replace(/^\+91/, '+91 ') ?? profile?.user.email ?? '';

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <AppText variant="section">{profile?.user.name ?? phone}</AppText>
        {profile?.user.name ? <AppText color={colors.slate}>{phone}</AppText> : null}
        {role ? <AppText color={colors.slate}>{t(`roles.${role}`)}</AppText> : null}
      </View>
      <LanguagePicker />
      <Button
        variant="secondary"
        label={t('profile.logout')}
        onPress={onLogout}
        loading={out.isPending}
      />
      <Button
        variant="text"
        label={t('profile.deleteAccount')}
        onPress={onDelete}
        loading={remove.isPending}
        testID="delete-account"
      />
      {remove.error ? (
        <AppText color={colors.bad} accessibilityLiveRegion="polite">
          {errorMessage(t, remove.error)}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.xs,
  },
});
