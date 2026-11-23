import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, RefreshControl, StyleSheet, View } from 'react-native';

import { getErrorMessage } from '@/api/errors';
import { AppText, Avatar, Button, Card, confirm, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useLeaveClassroom, useStudentClassroom } from '@/features/classrooms';
import { formatDate, pluralize } from '@/lib/format';
import { useManualRefresh } from '@/lib/useManualRefresh';
import { colors, spacing } from '@/theme';

export default function StudentClassroomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: classroom, error, refetch, isRefetching } = useStudentClassroom(id);
  const leave = useLeaveClassroom();
  const { refreshing, onRefresh } = useManualRefresh(refetch);

  if (!classroom) {
    if (error) {
      return (
        <ErrorState error={error} onRetry={() => void refetch()} retrying={isRefetching}>
          <Button title="Back to my classes" variant="ghost" onPress={() => router.dismissTo('/(student)')} />
        </ErrorState>
      );
    }
    return <LoadingState />;
  }

  const handleLeave = async () => {
    const ok = await confirm({
      title: `Leave "${classroom.name}"?`,
      message: "You'll need a new code from your teacher to join again.",
      confirmText: 'Leave',
      destructive: true,
    });
    if (!ok) return;
    leave.mutate(classroom.id, {
      onSuccess: () => router.dismissTo('/(student)'),
      onError: (leaveError) => Alert.alert("Couldn't leave class", getErrorMessage(leaveError)),
    });
  };

  return (
    <Screen
      scroll
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
      }
    >
      <Stack.Screen options={{ title: classroom.name }} />

      <View style={styles.info}>
        {classroom.subject ? (
          <AppText variant="label" color={colors.primary}>
            {classroom.subject.toUpperCase()}
          </AppText>
        ) : null}
        <AppText variant="title">{classroom.name}</AppText>
        {classroom.description ? (
          <AppText variant="body" color={colors.textMuted}>
            {classroom.description}
          </AppText>
        ) : null}
      </View>

      <Card style={styles.teacherCard}>
        <Avatar name={classroom.teacher.fullName} uri={classroom.teacher.avatarUrl} size={48} />
        <View style={styles.flex}>
          <AppText variant="caption">Teacher</AppText>
          <AppText variant="heading">{classroom.teacher.fullName}</AppText>
        </View>
      </Card>

      <Card style={styles.stats}>
        <Stat icon="people-outline" label="Classmates" value={pluralize(classroom.studentCount, 'student')} />
        <Stat icon="calendar-outline" label="Joined" value={formatDate(classroom.joinedAt)} />
        <Stat
          icon={classroom.joinedVia === 'qr' ? 'qr-code-outline' : 'keypad-outline'}
          label="Joined via"
          value={classroom.joinedVia === 'qr' ? 'QR code' : 'Class code'}
        />
      </Card>

      <View style={styles.footer}>
        <Button
          title="Leave class"
          icon="exit-outline"
          variant="danger"
          onPress={handleLeave}
          loading={leave.isPending}
        />
      </View>
    </Screen>
  );
}

function Stat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <AppText variant="caption" style={styles.flex}>
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  info: { gap: spacing.xs },
  teacherCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stats: { gap: spacing.md },
  stat: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  footer: { marginTop: 'auto', paddingTop: spacing.xl },
});
