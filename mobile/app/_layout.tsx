import { QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuthStore } from '@/features/auth';
import { stackScreenOptions } from '@/lib/navigation';
import { queryClient, subscribeAppStateFocus } from '@/lib/queryClient';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role ?? null);
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
    return subscribeAppStateFocus();
  }, [bootstrap]);

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);

  // Keep the native splash screen up until the stored session has been restored.
  if (status === 'loading') return null;

  const signedIn = status === 'signedIn';

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={stackScreenOptions}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          {/* Deep link target (wideimpactclassroom://join?code=…); always reachable. */}
          <Stack.Screen name="join" options={{ headerShown: false, animation: 'none' }} />

          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="(auth)/sign-in" options={{ headerShown: false }} />
          </Stack.Protected>

          <Stack.Protected guard={signedIn && role === null}>
            <Stack.Screen name="(auth)/choose-role" options={{ headerShown: false }} />
          </Stack.Protected>

          <Stack.Protected guard={signedIn && role === 'teacher'}>
            <Stack.Screen name="(teacher)" options={{ headerShown: false }} />
          </Stack.Protected>

          <Stack.Protected guard={signedIn && role === 'student'}>
            <Stack.Screen name="(student)" options={{ headerShown: false }} />
          </Stack.Protected>

          <Stack.Protected guard={signedIn && role !== null}>
            <Stack.Screen name="profile" options={{ title: 'Profile' }} />
          </Stack.Protected>
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
