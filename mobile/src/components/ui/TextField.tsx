import { forwardRef, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
  /** Show a "n/max" counter under the input. */
  showCounter?: boolean;
}

export const TextField = forwardRef<TextInputInstance, TextFieldProps>(function TextField(
  { label, error, hint, showCounter, maxLength, multiline, style, onFocus, onBlur, value, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={styles.container}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <TextInput
        ref={ref}
        value={value}
        maxLength={maxLength}
        multiline={multiline}
        placeholderTextColor={colors.textSubtle}
        selectionColor={colors.primary}
        accessibilityLabel={label}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
        style={[styles.input, multiline && styles.multiline, { borderColor }, style]}
      />
      <View style={styles.footer}>
        {error ? (
          <AppText variant="caption" color={colors.danger} style={styles.flex}>
            {error}
          </AppText>
        ) : hint ? (
          <AppText variant="caption" style={styles.flex}>
            {hint}
          </AppText>
        ) : (
          <View style={styles.flex} />
        )}
        {showCounter && maxLength ? (
          <AppText variant="caption" color={colors.textSubtle}>
            {(value ?? '').length}/{maxLength}
          </AppText>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  input: {
    ...typography.body,
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, minHeight: 18 },
  flex: { flex: 1 },
});
