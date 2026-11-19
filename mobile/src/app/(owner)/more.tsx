import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ProfileSection } from '@/features/profile/profile-section';

/** Teams, AMC, reports… come later. Employees (invites, D-025), account and language. */
export default function MoreScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Button variant="secondary" label={t('owner.employees')} onPress={() => router.push('/employees')} />
      <ProfileSection />
    </Screen>
  );
}
