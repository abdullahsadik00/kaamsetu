import { useMutation } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { colors, radius, space } from '@/theme/tokens';

import { acceptInvite, inviteTokenFrom } from './session';

/** Camera view that reads the owner's invite QR and joins at once. */
export function ScanScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [notInvite, setNotInvite] = useState(false);
  const busy = useRef(false);
  const join = useMutation({
    mutationFn: acceptInvite,
    // On success the root layout's guards switch to the role's home.
    onSuccess: () => router.replace('/'),
    onSettled: () => {
      busy.current = false;
    },
  });

  if (!permission) return <ActivityIndicator style={{ flex: 1 }} color={colors.teal} />;

  if (!permission.granted) {
    return (
      <Screen>
        <View style={styles.ask}>
          <View style={styles.askIcon}>
            <Icon name="qrcode-scan" size={56} color={colors.teal} />
          </View>
          <AppText weight="semibold" style={styles.center}>
            {t('join.cameraNeeded')}
          </AppText>
          <View style={styles.askButton}>
            <Button label={t('join.allowCamera')} icon="camera-outline" size="large" onPress={requestPermission} />
          </View>
        </View>
      </Screen>
    );
  }

  const onScanned = ({ data }: { data: string }) => {
    if (busy.current || join.isPending) return;
    const token = inviteTokenFrom(data);
    if (!token) return setNotInvite(true);
    busy.current = true;
    setNotInvite(false);
    join.mutate({ token });
  };

  return (
    <View style={styles.wrap}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={join.isPending ? undefined : onScanned}
      />
      {/* Viewfinder frame over the camera (screen 55). */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          <View style={styles.scanLine} />
        </View>
      </View>
      <View style={styles.panel}>
        {join.isPending ? <ActivityIndicator color={colors.white} /> : null}
        <AppText weight="semibold" color={colors.white} style={styles.center}>
          {t('join.scanHint')}
        </AppText>
        {notInvite ? (
          <AppText weight="semibold" color={colors.badTint} style={styles.center}>
            {t('join.notInvite')}
          </AppText>
        ) : null}
        {join.error ? (
          <AppText weight="semibold" color={colors.badTint} style={styles.center} accessibilityLiveRegion="polite">
            {errorMessage(t, join.error)}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const C = 28;

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#05111A' },
  camera: { flex: 1 },
  center: { textAlign: 'center' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 240, justifyContent: 'center' },
  corner: { position: 'absolute', width: C, height: C, borderColor: colors.teal },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: radius.md },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radius.md },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radius.md },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: radius.md },
  scanLine: { height: 2, marginHorizontal: space.lg, backgroundColor: colors.teal, opacity: 0.7 },
  panel: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: space.xl,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: space.lg,
    gap: space.sm,
    borderRadius: radius.lg,
  },
  ask: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  askIcon: { width: 140, height: 140, borderRadius: 70, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  askButton: { alignSelf: 'stretch' },
});
