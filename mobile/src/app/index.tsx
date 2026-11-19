import { Redirect } from 'expo-router';

import { homeRoute, useSession } from '@/features/auth/session';

/** Entry point: login, or the home screen for the user's role. */
export default function Index() {
  const status = useSession((s) => s.status);
  const profile = useSession((s) => s.profile);
  return <Redirect href={homeRoute({ status, profile })} />;
}
