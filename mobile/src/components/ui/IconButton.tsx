import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { colors, radius } from '@/theme';

export interface IconButtonProps extends Omit<PressableProps, 'children'> {
  icon: ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel: string;
  color?: string;
  size?: number;
}

export function IconButton({ icon, color = colors.primary, size = 24, style, ...rest }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      {...rest}
      style={(state) => [
        styles.base,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { padding: 6, borderRadius: radius.pill },
  pressed: { backgroundColor: colors.surfaceMuted },
});
