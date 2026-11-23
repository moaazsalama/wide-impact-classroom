import { useMutation } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { AppText, Avatar, Button, Card, confirm, Screen } from '@/components/ui';
import { env } from '@/config/env';
import { useAuthStore } from '@/features/auth';
import { formatDate } from '@/lib/format';
import { colors, spacing } from '@/theme';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const signOutMutation = useMutation({ mutationFn: signOut });

  const handleSignOut = async () => {
    const ok = await confirm({ title: 'Sign out?', confirmText: 'Sign out', destructive: true });
    if (ok) signOutMutation.mutate();
  };

  if (!user) return null;

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Avatar name={user.fullName} uri={user.avatarUrl} size={88} />
        <AppText variant="title" align="center">
          {user.fullName}
        </AppText>
        <AppText variant="body" color={colors.textMuted} align="center">
          {user.email}
        </AppText>
      </View>

      <Card style={styles.details}>
        <Row label="Role" value={user.role === 'teacher' ? 'Teacher' : user.role === 'student' ? 'Student' : '—'} />
        <Row label="Member since" value={formatDate(user.createdAt)} />
        <Row label="Server" value={env.apiUrl} />
      </Card>

      <Button
        title="Sign out"
        icon="log-out-outline"
        variant="danger"
        onPress={handleSignOut}
        loading={signOutMutation.isPending}
      />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="bodyStrong" numberOfLines={1} style={styles.rowValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingTop: spacing.xl },
  header: { alignItems: 'center', gap: spacing.sm },
  details: { gap: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowValue: { flexShrink: 1, textAlign: 'right' },
});
