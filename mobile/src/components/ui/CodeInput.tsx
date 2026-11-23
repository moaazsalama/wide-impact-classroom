import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

export interface CodeInputHandle {
  focus: () => void;
  clear: () => void;
}

export interface CodeInputProps {
  value: string;
  onChangeText: (value: string) => void;
  /** Fired once all cells are filled. */
  onComplete?: (value: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  /**
   * Optional normaliser for pasted text (e.g. extract a code from a pasted link).
   * Return null to fall back to keeping only digits.
   */
  normalizePaste?: (raw: string) => string | null;
}

/**
 * OTP-style numeric input. A single transparent TextInput sits over the visual
 * cells, so auto-advance, backspace, SMS autofill and paste all work natively.
 */
export const CodeInput = forwardRef<CodeInputHandle, CodeInputProps>(function CodeInput(
  { value, onChangeText, onComplete, length = 6, error, disabled, autoFocus = true, normalizePaste },
  ref,
) {
  const inputRef = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    clear: () => onChangeText(''),
  }));

  const handleChange = (raw: string) => {
    const normalized =
      (raw.length > value.length + 1 ? normalizePaste?.(raw) : null) ?? raw.replace(/\D/g, '');
    const next = normalized.slice(0, length);
    onChangeText(next);
    if (next.length === length && next !== value) onComplete?.(next);
  };

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      style={styles.row}
      accessibilityLabel={`Join code, ${value.length} of ${length} digits entered`}
      disabled={disabled}
    >
      {Array.from({ length }, (_, index) => {
        const digit = value[index] ?? '';
        const isActive = focused && index === activeIndex && !disabled;
        return (
          <View
            key={index}
            style={[
              styles.cell,
              digit ? styles.cellFilled : null,
              isActive ? styles.cellActive : null,
              error ? styles.cellError : null,
            ]}
          >
            <AppText variant="title" style={styles.digit}>
              {digit}
            </AppText>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        editable={!disabled}
        caretHidden
        contextMenuHidden={false}
        style={styles.hiddenInput}
        accessibilityLabel="Join code"
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  cell: {
    flex: 1,
    maxWidth: 52,
    aspectRatio: 0.82,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: { borderColor: colors.borderStrong },
  cellActive: { borderColor: colors.primary, borderWidth: 2 },
  cellError: { borderColor: colors.danger },
  digit: { fontVariant: ['tabular-nums'] },
  hiddenInput: {
    ...StyleSheet.absoluteFill,
    opacity: 0.011,
    color: 'transparent',
    fontSize: 1,
  },
});
