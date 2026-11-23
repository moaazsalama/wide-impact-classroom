import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { Avatar } from '@/components/ui';
import { useCurrentUser } from '@/features/auth';

export function HeaderProfileButton() {
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <Pressable
      onPress={() => router.push('/profile')}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Open profile"
    >
      <Avatar name={user.fullName} uri={user.avatarUrl} size={32} />
    </Pressable>
  );
}
