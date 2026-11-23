import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

type Tone = 'error' | 'info' | 'success' | 'warning';

const TONES: Record<Tone, { bg: string; fg: string; icon: 'alert-circle' | 'information-circle' | 'checkmark-circle' | 'warning' }> = {
  error: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' },
  info: { bg: colors.primarySoft, fg: colors.primary, icon: 'information-circle' },
  success: { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle' },
  warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'warning' },
};

export function InlineMessage({ tone = 'info', message }: { tone?: Tone; message: string }) {
  const palette = TONES[tone];
  return (
    <View
      style={[styles.container, { backgroundColor: palette.bg }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons name={palette.icon} size={18} color={palette.fg} />
      <AppText variant="caption" color={palette.fg} style={styles.text}>
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  text: { flex: 1, fontWeight: '500' },
});
