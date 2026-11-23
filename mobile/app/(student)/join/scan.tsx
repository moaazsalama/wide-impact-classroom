import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AppText, Button, EmptyState, InlineMessage, LoadingState, Screen } from '@/components/ui';
import { parseJoinPayload } from '@/features/join';
import { colors, radius, spacing } from '@/theme';

const VIEWFINDER_SIZE = 250;
const INVALID_SCAN_COOLDOWN_MS = 2000;

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isFocused, setIsFocused] = useState(true);
  const [invalidMessage, setInvalidMessage] = useState<string | null>(null);
  // A ref (not state) so that the many frames delivered per second see the lock synchronously.
  const scanLock = useRef(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-arm the scanner every time the screen regains focus; release the camera when blurred.
  useFocusEffect(
    useCallback(() => {
      scanLock.current = false;
      setInvalidMessage(null);
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
  );

  useEffect(
    () => () => {
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    },
    [],
  );

  const goToCodeEntry = () => router.replace('/(student)/join/code');

  const handleScan = useCallback(({ data }: BarcodeScanningResult) => {
    if (scanLock.current) return;
    scanLock.current = true;

    const code = parseJoinPayload(data);
    if (!code) {
      setInvalidMessage("That QR code isn't a Wide Impact class code. Try again.");
      cooldownTimer.current = setTimeout(() => {
        scanLock.current = false;
      }, INVALID_SCAN_COOLDOWN_MS);
      return;
    }

    setInvalidMessage(null);
    router.push({ pathname: '/(student)/join/confirm', params: { code, method: 'qr' } });
  }, []);

  if (!permission) return <LoadingState />;

  if (!permission.granted) {
    const blocked = !permission.canAskAgain;
    return (
      <Screen>
        <EmptyState
          icon="camera-outline"
          title={blocked ? 'Camera access is off' : 'Allow camera access'}
          message={
            blocked
              ? 'To scan a class QR code, enable camera access for Wide Impact Classroom in your device settings.'
              : 'We use the camera only to scan your teacher’s QR code.'
          }
        >
          {blocked ? (
            <Button title="Open settings" icon="settings-outline" onPress={() => void Linking.openSettings()} />
          ) : (
            <Button title="Allow camera" icon="camera-outline" onPress={() => void requestPermission()} />
          )}
          <Button title="Enter code instead" variant="ghost" onPress={goToCodeEntry} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      {isFocused ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleScan}
        />
      ) : null}

      {/* Viewfinder overlay: dimmed mask around a clear square. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.mask} />
        <View style={styles.middleRow}>
          <View style={styles.mask} />
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <View style={styles.mask} />
        </View>
        <View style={[styles.mask, styles.bottom]}>
          <AppText variant="bodyStrong" color={colors.textInverse} align="center">
            Point your camera at the class QR code
          </AppText>
          {invalidMessage ? <InlineMessage tone="error" message={invalidMessage} /> : null}
          <Button title="Enter code instead" icon="keypad-outline" variant="outline" onPress={goToCodeEntry} />
        </View>
      </View>
    </View>
  );
}

const CORNER = 28;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  mask: { flex: 1, backgroundColor: colors.overlay },
  middleRow: { flexDirection: 'row', height: VIEWFINDER_SIZE },
  viewfinder: { width: VIEWFINDER_SIZE, height: VIEWFINDER_SIZE },
  bottom: { padding: spacing.xl, gap: spacing.lg, justifyContent: 'flex-start' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.textInverse },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: radius.md,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: radius.md,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: radius.md,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: radius.md,
  },
});
