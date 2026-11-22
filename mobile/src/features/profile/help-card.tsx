import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { apiBaseUrl } from '@/api/config';
import { AppText } from '@/components/ui/app-text';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { api } from '@/features/auth/session';
import { colors, space } from '@/theme/tokens';

type Support = { whatsapp: string | null; email: string | null };

/**
 * Help (T7.3): message support on WhatsApp or by email, privacy policy and
 * terms, app version. The contacts come from the server (GET /support) so
 * they can change without a new app; a contact that is not set is not shown.
 */
export function HelpCard() {
  const { t } = useTranslation();
  const support = useQuery({
    queryKey: ['support'],
    queryFn: () => api.get<Support>('/support'),
    staleTime: 60 * 60 * 1000,
  });
  const version = Constants.expoConfig?.version ?? '?';
  const message = t('help.message', { version });
  const open = (url: string) => void Linking.openURL(url).catch(() => undefined);
  const { whatsapp, email } = support.data ?? {};

  return (
    <View style={styles.wrap}>
      <AppText variant="section">{t('help.title')}</AppText>
      <Card style={styles.rows}>
        {whatsapp ? (
          <ListRow
            icon="whatsapp"
            title={t('help.whatsapp')}
            subtitle={t('help.whatsappHint')}
            onPress={() => open(`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`)}
            divider
          />
        ) : null}
        {email ? (
          <ListRow
            icon="email-outline"
            title={t('help.email')}
            subtitle={email}
            onPress={() => open(`mailto:${email}?subject=${encodeURIComponent(message)}`)}
            divider
          />
        ) : null}
        <ListRow icon="shield-lock-outline" title={t('help.privacy')} onPress={() => open(`${apiBaseUrl()}/privacy`)} divider />
        <ListRow icon="file-document-outline" title={t('help.terms')} onPress={() => open(`${apiBaseUrl()}/terms`)} />
      </Card>
      <AppText variant="small" color={colors.muted} style={styles.center}>
        {t('help.version', { version })}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  rows: { paddingVertical: space.xs },
  center: { textAlign: 'center' },
});
