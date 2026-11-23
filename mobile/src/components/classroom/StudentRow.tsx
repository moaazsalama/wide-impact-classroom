import { StyleSheet, View } from 'react-native';

import { AppText, Avatar, IconButton } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { colors, spacing } from '@/theme';
import type { Student } from '@/types/api';

export interface StudentRowProps {
  student: Student;
  onRemove?: (student: Student) => void;
  removing?: boolean;
}

export function StudentRow({ student, onRemove, removing }: StudentRowProps) {
  return (
    <View style={[styles.row, removing && styles.removing]}>
      <Avatar name={student.fullName} uri={student.avatarUrl} size={40} />
      <View style={styles.info}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {student.fullName}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {student.email}
        </AppText>
        <AppText variant="caption" color={colors.textSubtle}>
          Joined {formatRelative(student.joinedAt)} via {student.joinedVia === 'qr' ? 'QR code' : 'code'}
        </AppText>
      </View>
      {onRemove ? (
        <IconButton
          icon="person-remove-outline"
          color={colors.danger}
          size={20}
          disabled={removing}
          onPress={() => onRemove(student)}
          accessibilityLabel={`Remove ${student.fullName}`}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  removing: { opacity: 0.4 },
  info: { flex: 1, gap: 1 },
});
