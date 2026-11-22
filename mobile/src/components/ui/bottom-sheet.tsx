import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Dimensions, Easing, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

const OPEN_MS = 260;
const CLOSE_MS = 200;

/**
 * Bottom sheet (DESIGN.md "Bottom Drawers"): 12 dp top corners over a dimmed
 * screen; tapping outside or Back closes it. The dim fades and the sheet
 * slides on its own (BUG-03): the Modal's own "slide" moved the dark
 * overlay up with the sheet.
 */
export function BottomSheet({ visible, onClose, title, subtitle, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  // Stays mounted until the closing animation has finished.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const [height, setHeight] = useState(Dimensions.get('window').height);
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.timing(progress, { toValue: 1, duration: OPEN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: CLOSE_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
        ({ finished }) => finished && setMounted(false),
      );
    }
  }, [visible, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable style={styles.fill} onPress={onClose} accessibilityLabel={title} accessibilityRole="button" />
        </Animated.View>
        <Animated.View
          style={[styles.sheet, { paddingBottom: space.lg + insets.bottom, transform: [{ translateY }] }]}
          onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
          accessibilityViewIsModal
        >
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
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(20,33,61,0.45)' },
  fill: { flex: 1 },
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
