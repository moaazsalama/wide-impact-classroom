import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

import { AppText } from './AppText';

export interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: number;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, uri, size = 40 }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[styles.base, dimension]}
        contentFit="cover"
        transition={150}
        onError={() => setFailed(true)}
        accessibilityLabel={name}
      />
    );
  }

  return (
    <View style={[styles.base, styles.fallback, dimension]} accessibilityLabel={name}>
      <AppText variant="bodyStrong" color={colors.primary} style={{ fontSize: size * 0.38, lineHeight: size * 0.5 }}>
        {getInitials(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.surfaceMuted },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
});
