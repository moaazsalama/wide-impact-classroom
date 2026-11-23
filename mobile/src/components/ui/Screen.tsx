import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (forms, long content). */
  scroll?: boolean;
  /** Safe-area edges to pad. Screens under a native header usually only need the bottom edge. */
  edges?: Edge[];
  padded?: boolean;
  keyboardAvoiding?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
}

export function Screen({
  children,
  scroll = false,
  edges = ['bottom'],
  padded = true,
  keyboardAvoiding = false,
  refreshControl,
  contentContainerStyle,
  style,
  backgroundColor = colors.background,
}: ScreenProps) {
  const padding = padded ? styles.padded : null;

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, padding, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, padding, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor }, style]}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  padded: { padding: spacing.lg },
  scrollContent: { flexGrow: 1 },
});
