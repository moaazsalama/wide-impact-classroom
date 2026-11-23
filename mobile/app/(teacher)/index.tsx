import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ClassroomCard } from '@/components/classroom';
import { Button, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useTeacherClassrooms } from '@/features/classrooms';
import { useManualRefresh } from '@/lib/useManualRefresh';
import { colors, spacing } from '@/theme';

export default function TeacherClassroomsScreen() {
  const { data, error, isPending, refetch, isRefetching } = useTeacherClassrooms();
  const { refreshing, onRefresh } = useManualRefresh(refetch);

  const goToCreate = () => router.push('/(teacher)/classrooms/new');

  if (isPending) return <LoadingState message="Loading your classrooms…" />;
  if (error && !data) {
    return <ErrorState error={error} onRetry={() => void refetch()} retrying={isRefetching} />;
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, data.length === 0 && styles.emptyList]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        renderItem={({ item }) => (
          <ClassroomCard
            variant="teacher"
            classroom={item}
            onPress={() => router.push({ pathname: '/(teacher)/classrooms/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="easel-outline"
            title="No classrooms yet"
            message="Create your first classroom and share its QR code or join code with your students."
          >
            <Button title="Create classroom" icon="add" onPress={goToCreate} />
          </EmptyState>
        }
        ListFooterComponent={
          data.length > 0 ? (
            <Button title="New classroom" icon="add" variant="secondary" onPress={goToCreate} style={styles.footer} />
          ) : undefined
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  emptyList: { flexGrow: 1 },
  separator: { height: spacing.md },
  footer: { marginTop: spacing.xl },
});
