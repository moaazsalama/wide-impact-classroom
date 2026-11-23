import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { getErrorMessage, isApiError } from '@/api/errors';
import {
  AppText,
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  InlineMessage,
  LoadingState,
  Screen,
} from '@/components/ui';
import { useAuthStore } from '@/features/auth';
import { useJoinClassroom, useLookupClassroom } from '@/features/classrooms';
import { isValidJoinCode } from '@/features/join';
import { formatJoinCode, pluralize } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import type { JoinMethod } from '@/types/api';

function openClassroom(id: string) {
  // Reset the join flow so "back" from the class returns to My classes.
  router.dismissTo('/(student)');
  router.push({ pathname: '/(student)/classrooms/[id]', params: { id } });
}

export default function ConfirmJoinScreen() {
  const params = useLocalSearchParams<{ code?: string; method?: string }>();
  const code = isValidJoinCode(params.code) ? params.code : undefined;
  const method: JoinMethod = params.method === 'code' ? 'code' : 'qr';

  const setPendingJoinCode = useAuthStore((s) => s.setPendingJoinCode);
  const lookup = useLookupClassroom(code);
  const join = useJoinClassroom();

  // A pending deep-link code has been consumed once we get here.
  useEffect(() => setPendingJoinCode(null), [setPendingJoinCode]);

  const tryAnotherCode = () => router.replace('/(student)/join/code');

  if (!code) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Invalid code" message="Class codes are exactly 6 digits.">
          <Button title="Enter a code" onPress={tryAnotherCode} />
        </EmptyState>
      </Screen>
    );
  }

  if (lookup.isPending) return <LoadingState message="Looking up class…" />;

  if (lookup.error) {
    if (isApiError(lookup.error, 'INVALID_JOIN_CODE')) {
      return (
        <Screen>
          <EmptyState
            icon="search-outline"
            title="No classroom found with that code"
            message={`Double-check ${formatJoinCode(code)} with your teacher — codes change when a teacher generates a new one.`}
          >
            <Button title="Try another code" icon="keypad-outline" onPress={tryAnotherCode} />
            <Button
              title="Scan QR code"
              icon="qr-code-outline"
              variant="ghost"
              onPress={() => router.replace('/(student)/join/scan')}
            />
          </EmptyState>
        </Screen>
      );
    }
    return (
      <Screen>
        <ErrorState error={lookup.error} onRetry={() => void lookup.refetch()} retrying={lookup.isRefetching} />
      </Screen>
    );
  }

  const classroom = lookup.data;

  const handleJoin = () =>
    join.mutate(
      { code, method },
      {
        onSuccess: ({ classroom: joined, alreadyEnrolled }) => {
          if (alreadyEnrolled) Alert.alert("You're already in this class", joined.name);
          openClassroom(joined.id);
        },
      },
    );

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <View style={styles.badge}>
          <AppText variant="display" color={colors.primary}>
            {classroom.name.trim().charAt(0).toUpperCase()}
          </AppText>
        </View>
        {classroom.subject ? (
          <AppText variant="label" color={colors.primary} align="center">
            {classroom.subject.toUpperCase()}
          </AppText>
        ) : null}
        <AppText variant="title" align="center">
          {classroom.name}
        </AppText>
        {classroom.description ? (
          <AppText variant="body" color={colors.textMuted} align="center">
            {classroom.description}
          </AppText>
        ) : null}

        <View style={styles.divider} />

        <View style={styles.teacherRow}>
          <Avatar name={classroom.teacher.fullName} uri={classroom.teacher.avatarUrl} size={36} />
          <View style={styles.flex}>
            <AppText variant="caption">Teacher</AppText>
            <AppText variant="bodyStrong">{classroom.teacher.fullName}</AppText>
          </View>
          <AppText variant="caption">{pluralize(classroom.studentCount, 'student')}</AppText>
        </View>
      </Card>

      {classroom.isEnrolled ? (
        <>
          <InlineMessage tone="success" message="You're already in this class." />
          <Button title="Open class" size="lg" onPress={() => openClassroom(classroom.id)} />
        </>
      ) : (
        <>
          {join.error ? <InlineMessage tone="error" message={getErrorMessage(join.error)} /> : null}
          <Button title="Join class" icon="enter-outline" size="lg" onPress={handleJoin} loading={join.isPending} />
          <Button title="Cancel" variant="ghost" onPress={() => router.back()} disabled={join.isPending} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingTop: spacing.xl },
  card: { alignItems: 'stretch', gap: spacing.sm },
  badge: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.sm },
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
});
