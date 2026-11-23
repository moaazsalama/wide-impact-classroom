import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText, Avatar, Card } from '@/components/ui';
import { formatJoinCode, pluralize } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import type { StudentClassroom, TeacherClassroom } from '@/types/api';

type Props =
  | { variant: 'teacher'; classroom: TeacherClassroom; onPress: () => void }
  | { variant: 'student'; classroom: StudentClassroom; onPress: () => void };

export function ClassroomCard(props: Props) {
  const { classroom, onPress } = props;

  return (
    <Card onPress={onPress} accessibilityLabel={`Open ${classroom.name}`}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <AppText variant="heading" color={colors.primary}>
            {classroom.name.trim().charAt(0).toUpperCase()}
          </AppText>
        </View>
        <View style={styles.titleBlock}>
          <AppText variant="heading" numberOfLines={1}>
            {classroom.name}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {classroom.subject ?? 'No subject'}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} />
      </View>

      <View style={styles.footer}>
        <View style={styles.meta}>
          <Ionicons name="people-outline" size={16} color={colors.textMuted} />
          <AppText variant="caption">{pluralize(classroom.studentCount, 'student')}</AppText>
        </View>

        {props.variant === 'teacher' ? (
          <View style={styles.meta}>
            <Ionicons name="key-outline" size={16} color={colors.textMuted} />
            <AppText variant="caption" style={styles.code}>
              {formatJoinCode(props.classroom.joinCode)}
            </AppText>
          </View>
        ) : (
          <View style={styles.meta}>
            <Avatar name={props.classroom.teacher.fullName} uri={props.classroom.teacher.avatarUrl} size={20} />
            <AppText variant="caption" numberOfLines={1}>
              {props.classroom.teacher.fullName}
            </AppText>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1, gap: 2 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  code: { fontVariant: ['tabular-nums'], letterSpacing: 1 },
});
