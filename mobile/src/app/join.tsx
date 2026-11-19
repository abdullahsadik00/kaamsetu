import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { inviteTokenFrom, useSession } from '@/features/auth/session';

/**
 * Deep link `kaamsetu://join?t=…` (the invite QR opened with the phone's own
 * camera). Keeps the token in memory; the join screen accepts it after
 * Google sign-in.
 */
export default function JoinLink() {
  const { t } = useLocalSearchParams<{ t?: string }>();
  useEffect(() => {
    const token = t ? inviteTokenFrom(t) : null;
    if (token) useSession.setState({ pendingInvite: token });
  }, [t]);
  return <Redirect href="/" />;
}
