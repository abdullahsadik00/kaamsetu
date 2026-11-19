import { useMutation } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
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
        <AppText>{t('join.cameraNeeded')}</AppText>
        <Button label={t('join.allowCamera')} onPress={requestPermission} />
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
      <View style={styles.panel}>
        {join.isPending ? <ActivityIndicator color={colors.teal} /> : null}
        <AppText>{t('join.scanHint')}</AppText>
        {notInvite ? <AppText color={colors.bad}>{t('join.notInvite')}</AppText> : null}
        {join.error ? (
          <AppText color={colors.bad} accessibilityLiveRegion="polite">
            {errorMessage(t, join.error)}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.ink },
  camera: { flex: 1 },
  panel: {
    backgroundColor: colors.surface,
    padding: space.lg,
    gap: space.sm,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
});
