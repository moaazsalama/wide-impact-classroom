import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, CodeInput, Screen, type CodeInputHandle } from '@/components/ui';
import { isValidJoinCode, JOIN_CODE_LENGTH, parseJoinPayload } from '@/features/join';
import { colors, spacing } from '@/theme';

export default function EnterCodeScreen() {
  const [code, setCode] = useState('');
  const inputRef = useRef<CodeInputHandle>(null);
  // Prevents a double navigation when auto-submit and the button fire together.
  const navigating = useRef(false);

  useFocusEffect(
    useCallback(() => {
      navigating.current = false;
    }, []),
  );

  const submit = (value: string) => {
    if (!isValidJoinCode(value) || navigating.current) return;
    navigating.current = true;
    router.push({ pathname: '/(student)/join/confirm', params: { code: value, method: 'code' } });
  };

  return (
    <Screen scroll keyboardAvoiding contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <AppText variant="title">Enter the class code</AppText>
        <AppText variant="body" color={colors.textMuted}>
          Ask your teacher for the {JOIN_CODE_LENGTH}-digit code shown under the class QR code.
        </AppText>
      </View>

      <CodeInput
        ref={inputRef}
        value={code}
        onChangeText={setCode}
        onComplete={submit}
        length={JOIN_CODE_LENGTH}
        normalizePaste={parseJoinPayload}
      />

      <View style={styles.actions}>
        <Button title="Continue" onPress={() => submit(code)} disabled={!isValidJoinCode(code)} size="lg" />
        <Button
          title="Scan QR code instead"
          icon="qr-code-outline"
          variant="ghost"
          onPress={() => router.replace('/(student)/join/scan')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingTop: spacing.xl },
  header: { gap: spacing.sm },
  actions: { gap: spacing.sm },
});
