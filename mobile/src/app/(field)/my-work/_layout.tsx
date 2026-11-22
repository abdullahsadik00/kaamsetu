import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

/**
 * My Work tab: the list, and a job page pushed on top (screens 19-30), so the
 * tab bar stays (screens 20/21) and Back returns to the list. A hidden tab
 * (`href: null`) cannot be navigated to in this expo-router (BUG-15).
 */
export default function MyWorkLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }} />;
}
