import { Stack } from 'expo-router';

import { HeaderProfileButton } from '@/components/navigation/HeaderProfileButton';
import { stackScreenOptions } from '@/lib/navigation';

export const unstable_settings = { anchor: 'index' };

export default function StudentLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'My classes', headerBackVisible: false, headerRight: () => <HeaderProfileButton /> }} />
      <Stack.Screen name="join/scan" options={{ title: 'Scan QR code' }} />
      <Stack.Screen name="join/code" options={{ title: 'Enter class code' }} />
      <Stack.Screen name="join/confirm" options={{ title: 'Join class' }} />
      <Stack.Screen name="classrooms/[id]" options={{ title: 'Class' }} />
    </Stack>
  );
}
