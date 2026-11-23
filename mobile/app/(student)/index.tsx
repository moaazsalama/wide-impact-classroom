import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { ClassroomCard } from '@/components/classroom';
import { Button, EmptyState, ErrorState, LoadingState, Screen } from '@/components/ui';
import { useStudentClassrooms } from '@/features/classrooms';
import { useManualRefresh } from '@/lib/useManualRefresh';
import { colors, spacing } from '@/theme';

function JoinActions() {
  return (
    <View style={styles.actions}>
      <Button
        title="Scan QR"
        icon="qr-code-outline"
        onPress={() => router.push('/(student)/join/scan')}
        style={styles.action}
      />
      <Button
        title="Enter code"
        icon="keypad-outline"
        variant="secondary"
        onPress={() => router.push('/(student)/join/code')}
        style={styles.action}
      />
    </View>
  );
}

export default function StudentClassroomsScreen() {
  const { data, error, isPending, refetch, isRefetching } = useStudentClassrooms();
  const { refreshing, onRefresh } = useManualRefresh(refetch);

  if (isPending) return <LoadingState message="Loading your classes…" />;
  if (error && !data) {
    return <ErrorState error={error} onRetry={() => void refetch()} retrying={isRefetching} />;
  }

  const isEmpty = data.length === 0;

  return (
    <Screen padded={false}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, isEmpty && styles.emptyList]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListHeaderComponent={isEmpty ? undefined : <JoinActions />}
        renderItem={({ item }) => (
          <ClassroomCard
            variant="student"
            classroom={item}
            onPress={() => router.push({ pathname: '/(student)/classrooms/[id]', params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="school-outline"
            title="You haven't joined a class yet"
            message="Scan your teacher's QR code or type the 6-digit class code to get started."
          >
            <JoinActions />
          </EmptyState>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg },
  emptyList: { flexGrow: 1 },
  separator: { height: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  action: { flex: 1 },
});
