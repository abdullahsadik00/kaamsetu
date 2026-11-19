import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { LanguagePicker } from '@/components/ui/language-picker';
import { logout, useSession } from '@/features/auth/session';
import { colors, radius, space } from '@/theme/tokens';

type Props = {
  /** Number of saved changes not yet sent; logging out would lose them. */
  unsentCount?: () => Promise<number>;
};

/** Who is logged in, language switch, and log out. Shared by every role. */
export function ProfileSection({ unsentCount }: Props) {
  const { t } = useTranslation();
  const profile = useSession((s) => s.profile);
  const out = useMutation({ mutationFn: logout });

  const onLogout = async () => {
    const count = unsentCount ? await unsentCount() : 0;
    if (count === 0) return out.mutate();
    Alert.alert(t('profile.logoutTitle'), t('profile.logoutUnsent', { count }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logoutConfirm'), style: 'destructive', onPress: () => out.mutate() },
    ]);
  };

  const role = profile?.membership?.role;
  const phone = profile?.user.phone.replace(/^\+91/, '+91 ') ?? '';

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
