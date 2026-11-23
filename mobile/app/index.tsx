import { Redirect } from 'expo-router';

import { useAuthStore } from '@/features/auth';

/** Entry point: routes the user to the right area based on their session. */
export default function Index() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const pendingJoinCode = useAuthStore((s) => s.pendingJoinCode);

  if (status !== 'signedIn' || !user) return <Redirect href="/(auth)/sign-in" />;
  if (user.role === null) return <Redirect href="/(auth)/choose-role" />;
  if (user.role === 'teacher') return <Redirect href="/(teacher)" />;

  // Student who opened a join link before signing in: resume the join flow.
  if (pendingJoinCode) {
    return (
      <Redirect href={{ pathname: '/(student)/join/confirm', params: { code: pendingJoinCode, method: 'qr' } }} />
    );
  }
  return <Redirect href="/(student)" />;
}
