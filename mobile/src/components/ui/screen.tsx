import type { ReactElement, ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View, type RefreshControlProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';

import { OfflineBanner } from './offline-banner';

type Props = {
  children: ReactNode;
  /** Pinned to the bottom (main action), above the keyboard. */
  footer?: ReactNode;
  /** Tabs and stack headers already handle the top inset. */
  edges?: ('top' | 'bottom')[];
  /** Pull to refresh (a <RefreshControl>). */
  refreshControl?: ReactElement<RefreshControlProps>;
};

/** Paper-coloured, scrollable screen body with an optional pinned footer. */
export function Screen({ children, footer, edges = ['bottom'], refreshControl }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <OfflineBanner />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  body: { padding: space.lg, gap: space.lg, flexGrow: 1 },
  footer: {
    padding: space.lg,
    gap: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.paper,
  },
});
