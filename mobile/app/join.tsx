import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import { LoadingState, Screen } from '@/components/ui';
import { useAuthStore } from '@/features/auth';
import { parseJoinPayload } from '@/features/join';

/**
 * Deep link handler for `wideimpactclassroom://join?code=XXXXXX`.
 * - signed out / no role yet: remember the code, continue after onboarding
 * - student: go straight to the join confirmation
 * - teacher: explain that only students can join
 */
export default function JoinDeepLink() {
  const { code: rawCode } = useLocalSearchParams<{ code?: string }>();
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role ?? null);
  const setPendingJoinCode = useAuthStore((s) => s.setPendingJoinCode);

  useEffect(() => {
    const code = parseJoinPayload(rawCode);

    if (!code) {
      Alert.alert('Invalid link', 'This join link is not valid. Ask your teacher for a new code.');
      router.replace('/');
      return;
    }

    if (status !== 'signedIn' || role === null) {
      setPendingJoinCode(code);
      router.replace('/');
      return;
    }

    if (role === 'teacher') {
      Alert.alert('Teacher account', 'Only students can join a classroom. Sign in with a student account to join.');
      router.replace('/(teacher)');
      return;
    }

    setPendingJoinCode(null);
    // Return to the existing student stack (instead of stacking a second copy on top
    // of it), then open the confirmation screen from there.
    router.dismissTo('/(student)');
    router.push({ pathname: '/(student)/join/confirm', params: { code, method: 'qr' } });
  }, [rawCode, status, role, setPendingJoinCode]);

  return (
    <Screen edges={['top', 'bottom']}>
      <LoadingState message="Opening class…" />
    </Screen>
  );
}
