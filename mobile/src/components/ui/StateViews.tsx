import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { getErrorMessage, toApiError } from '@/api/errors';
import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

type IconName = ComponentProps<typeof Ionicons>['name'];

function StateLayout({
  icon,
  iconColor = colors.primary,
  iconBackground = colors.primarySoft,
  title,
  message,
  children,
}: {
  icon: IconName;
  iconColor?: string;
  iconBackground?: string;
  title: string;
  message?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={32} color={iconColor} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color={colors.textMuted} align="center" style={styles.message}>
          {message}
        </AppText>
      ) : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

export function LoadingState({ message }: { message?: string }) {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={message ?? 'Loading'}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? (
        <AppText variant="caption" align="center">
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  children?: ReactNode;
}

export function EmptyState({ icon = 'file-tray-outline', title, message, children }: EmptyStateProps) {
  return (
    <StateLayout icon={icon} title={title} message={message}>
      {children}
    </StateLayout>
  );
}

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
  title?: string;
  children?: ReactNode;
}

export function ErrorState({ error, onRetry, retrying, title, children }: ErrorStateProps) {
  const isOffline = toApiError(error).isNetworkError;
  return (
    <StateLayout
      icon={isOffline ? 'cloud-offline-outline' : 'alert-circle-outline'}
      iconColor={colors.danger}
      iconBackground={colors.dangerSoft}
      title={title ?? (isOffline ? "You're offline" : 'Something went wrong')}
      message={getErrorMessage(error)}
    >
      {onRetry ? (
        <Button title="Try again" icon="refresh" onPress={onRetry} loading={retrying} variant="outline" />
      ) : null}
      {children}
    </StateLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  message: { maxWidth: 320 },
  actions: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm },
});
