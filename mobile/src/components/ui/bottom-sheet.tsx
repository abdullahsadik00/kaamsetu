import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './app-text';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Pinned at the bottom of the sheet (main action). */
  footer?: ReactNode;
};

/**
 * Bottom sheet (DESIGN.md "Bottom Drawers"): 12 dp top corners over a dimmed
 * screen; tapping outside or Back closes it.
 */
export function BottomSheet({ visible, onClose, title, subtitle, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={title} accessibilityRole="button" />
        <View style={[styles.sheet, { paddingBottom: space.lg + insets.bottom }]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <View style={styles.head}>
            <AppText variant="section">{title}</AppText>
            {subtitle ? (
              <AppText variant="support" color={colors.slate}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(20,33,61,0.45)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '88%',
    paddingTop: space.sm,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line2, marginBottom: space.sm },
  head: { paddingHorizontal: space.lg, gap: 2, paddingBottom: space.sm },
  body: { paddingHorizontal: space.lg, gap: space.md, paddingBottom: space.md },
  footer: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.sm, borderTopWidth: 1, borderTopColor: colors.line },
});
