import { Text, type TextProps } from 'react-native';

import { typography } from '@/theme';

export type TextVariant = keyof typeof typography;

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export function AppText({ variant = 'body', color, align, style, ...rest }: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[typography[variant], color ? { color } : null, align ? { textAlign: align } : null, style]}
    />
  );
}
