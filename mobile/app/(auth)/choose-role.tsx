import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { getErrorMessage } from '@/api/errors';
import { AppText, Button, confirm, InlineMessage, Screen } from '@/components/ui';
import { useAuthStore, useChooseRole } from '@/features/auth';
import { colors, radius, spacing } from '@/theme';
import type { Role } from '@/types/api';

const OPTIONS: {
  role: Role;
  title: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}[] = [
  {
    role: 'teacher',
    title: "I'm a teacher",
    description: 'Create classrooms, share a QR code or join code, and manage your students.',
    icon: 'school-outline',
  },
  {
    role: 'student',
    title: "I'm a student",
    description: 'Join classes by scanning your teacher’s QR code or entering a 6-digit code.',
    icon: 'person-outline',
  },
];

export default function ChooseRoleScreen() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const chooseRole = useChooseRole();

  const select = async (role: Role, title: string) => {
    const ok = await confirm({
      title: `Continue as a ${role}?`,
      message: `You chose "${title}". Your role can't be changed later.`,
      confirmText: 'Continue',
    });
    if (ok) chooseRole.mutate(role, { onSuccess: () => router.replace('/') });
  };

  return (
    <Screen scroll edges={['top', 'bottom']} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <AppText variant="display">Welcome{user ? `, ${user.fullName.split(' ')[0]}` : ''}!</AppText>
        <AppText variant="body" color={colors.textMuted}>
          How will you use Wide Impact Classroom?
        </AppText>
      </View>

      <View style={styles.options}>
        {OPTIONS.map((option) => {
          const loading = chooseRole.isPending && chooseRole.variables === option.role;
          return (
            <Pressable
              key={option.role}
              onPress={() => select(option.role, option.title)}
              disabled={chooseRole.isPending}
              accessibilityRole="button"
              accessibilityLabel={option.title}
              style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
            >
              <View style={styles.optionIcon}>
                <Ionicons name={option.icon} size={28} color={colors.primary} />
              </View>
              <View style={styles.optionText}>
                <AppText variant="heading">{option.title}</AppText>
                <AppText variant="caption">{option.description}</AppText>
              </View>
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={colors.textSubtle} />
              )}
            </Pressable>
          );
        })}
      </View>

      {chooseRole.error ? <InlineMessage tone="error" message={getErrorMessage(chooseRole.error)} /> : null}

      <View style={styles.footer}>
        <Button title="Use a different account" variant="ghost" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingTop: spacing.xxxl },
  header: { gap: spacing.sm },
  options: { gap: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionPressed: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1, gap: spacing.xs },
  footer: { marginTop: 'auto' },
});
