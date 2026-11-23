import type { NativeStackNavigationOptions } from 'expo-router';

import { colors } from '@/theme';

/** Shared native-stack header styling for every navigator. */
export const stackScreenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.text, fontWeight: '600' },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  contentStyle: { backgroundColor: colors.background },
};
