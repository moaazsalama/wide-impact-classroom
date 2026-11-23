import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { getErrorMessage } from '@/api/errors';
import { JoinCodeCard, StudentRow } from '@/components/classroom';
import { AppText, Button, confirm, EmptyState, ErrorState, IconButton, InlineMessage, LoadingState } from '@/components/ui';
import {
  useDeleteClassroom,
  useRegenerateJoinCode,
  useRemoveStudent,
  useStudents,
  useTeacherClassroom,
} from '@/features/classrooms';
import { pluralize } from '@/lib/format';
import { useManualRefresh } from '@/lib/useManualRefresh';
import { colors, radius, spacing } from '@/theme';
import type { Student, TeacherClassroom } from '@/types/api';

export default function TeacherClassroomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classroomQuery = useTeacherClassroom(id);
  const studentsQuery = useStudents(id);
  const regenerate = useRegenerateJoinCode(id);
  const removeStudent = useRemoveStudent(id);
  const deleteClassroom = useDeleteClassroom();

  const { refreshing, onRefresh } = useManualRefresh(() =>
    Promise.all([classroomQuery.refetch(), studentsQuery.refetch()]),
  );

  const classroom = classroomQuery.data;

  if (!classroom) {
    if (classroomQuery.error) {
      return (
        <ErrorState
          error={classroomQuery.error}
          onRetry={() => void classroomQuery.refetch()}
          retrying={classroomQuery.isRefetching}
        >
          <Button title="Back to classrooms" variant="ghost" onPress={() => router.back()} />
        </ErrorState>
      );
    }
    return <LoadingState />;
  }

  const handleRegenerate = async () => {
    const ok = await confirm({
      title: 'Generate a new code?',
      message: 'The current QR code and join code will stop working immediately. Students already in the class are not affected.',
      confirmText: 'Generate',
      destructive: true,
    });
    if (!ok) return;
    regenerate.mutate(undefined, {
      onError: (error) => Alert.alert("Couldn't generate a new code", getErrorMessage(error)),
    });
  };

  const handleRemoveStudent = async (student: Student) => {
    const ok = await confirm({
      title: `Remove ${student.fullName}?`,
      message: 'They will lose access to this classroom. They can rejoin with the current code.',
      confirmText: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    removeStudent.mutate(student.id, {
      onError: (error) => Alert.alert("Couldn't remove student", getErrorMessage(error)),
    });
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete "${classroom.name}"?`,
      message: `All ${pluralize(classroom.studentCount, 'student')} will be removed. This cannot be undone.`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    deleteClassroom.mutate(classroom.id, {
      onSuccess: () => router.back(),
      onError: (error) => Alert.alert("Couldn't delete classroom", getErrorMessage(error)),
    });
  };

  const students = studentsQuery.data ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          title: classroom.name,
          headerRight: () =>
            deleteClassroom.isPending ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={styles.headerActions}>
                <IconButton
                  icon="create-outline"
                  accessibilityLabel="Edit classroom"
                  onPress={() => router.push({ pathname: '/(teacher)/classrooms/[id]/edit', params: { id: classroom.id } })}
                />
                <IconButton icon="trash-outline" color={colors.danger} accessibilityLabel="Delete classroom" onPress={handleDelete} />
              </View>
            ),
        }}
      />
      <FlatList
        data={studentsQuery.data ? students : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          <ClassroomHeader
            classroom={classroom}
            onRegenerate={handleRegenerate}
            regenerating={regenerate.isPending}
            studentCount={studentsQuery.data ? students.length : classroom.studentCount}
          />
        }
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.rowWrap,
              index === 0 && styles.rowFirst,
              index === students.length - 1 && styles.rowLast,
              index > 0 && styles.rowDivider,
            ]}
          >
            <StudentRow
              student={item}
              onRemove={handleRemoveStudent}
              removing={removeStudent.isPending && removeStudent.variables === item.id}
            />
          </View>
        )}
        ListEmptyComponent={
          studentsQuery.isPending ? (
            <LoadingState message="Loading students…" />
          ) : studentsQuery.error ? (
            <ErrorState
              error={studentsQuery.error}
              title="Couldn't load students"
              onRetry={() => void studentsQuery.refetch()}
              retrying={studentsQuery.isRefetching}
            />
          ) : (
            <EmptyState
              icon="people-outline"
              title="No students yet"
              message="Share the QR code or join code above. Students appear here as soon as they join."
            />
          )
        }
      />
    </>
  );
}

function ClassroomHeader({
  classroom,
  onRegenerate,
  regenerating,
  studentCount,
}: {
  classroom: TeacherClassroom;
  onRegenerate: () => void;
  regenerating: boolean;
  studentCount: number;
}) {
  return (
    <View style={styles.header}>
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

      <JoinCodeCard classroom={classroom} onRegenerate={onRegenerate} regenerating={regenerating} />

      {regenerating ? <InlineMessage tone="info" message="Generating a new code…" /> : null}

      <AppText variant="heading" style={styles.sectionTitle}>
        Students · {studentCount}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl, flexGrow: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  header: { gap: spacing.lg, marginBottom: spacing.md },
  info: { gap: spacing.xs },
  sectionTitle: { marginTop: spacing.sm },
  rowWrap: { overflow: 'hidden', backgroundColor: colors.surface },
  rowFirst: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  rowLast: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
