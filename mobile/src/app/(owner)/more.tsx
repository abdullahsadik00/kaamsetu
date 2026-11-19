import { Screen } from '@/components/ui/screen';
import { ProfileSection } from '@/features/profile/profile-section';

/** Teams, Employees, AMC… come later; for now: account and language. */
export default function MoreScreen() {
  return (
    <Screen>
      <ProfileSection />
    </Screen>
  );
}
