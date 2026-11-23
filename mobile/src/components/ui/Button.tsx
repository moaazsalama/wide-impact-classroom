import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg' | 'sm';
type IconName = ComponentProps<typeof Ionicons>['name'];

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: IconName;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const VARIANTS: Record<ButtonVariant, { bg: string; pressed: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.primaryOn },
  secondary: { bg: colors.primarySoft, pressed: '#EFD6DE', fg: colors.primary },
  outline: { bg: colors.surface, pressed: colors.surfaceMuted, fg: colors.text, border: colors.borderStrong },
  ghost: { bg: 'transparent', pressed: colors.surfaceMuted, fg: colors.primary },
  danger: { bg: colors.dangerSoft, pressed: '#F9D7D7', fg: colors.danger },
};

const SIZES: Record<ButtonSize, { height: number; paddingX: number; icon: number }> = {
  sm: { height: 36, paddingX: spacing.md, icon: 16 },
  md: { height: 48, paddingX: spacing.lg, icon: 18 },
  lg: { height: 54, paddingX: spacing.xl, icon: 20 },
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  fullWidth = true,
  style,
  ...rest
}: ButtonProps) {
  const palette = VARIANTS[variant];
  const dims = SIZES[size];
  const isDisabled = Boolean(disabled) || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={title}
      disabled={isDisabled}
      hitSlop={4}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        {
          height: dims.height,
          paddingHorizontal: dims.paddingX,
          backgroundColor: pressed ? palette.pressed : palette.bg,
          borderColor: palette.border ?? 'transparent',
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: isDisabled && !loading ? 0.5 : 1,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={palette.fg} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={dims.icon} color={palette.fg} /> : null}
            <AppText variant="bodyStrong" color={palette.fg} numberOfLines={1}>
              {title}
            </AppText>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
