import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, InlineMessage, Screen, TextField } from '@/components/ui';
import { getErrorMessage, isApiError } from '@/api/errors';
import { env } from '@/config/env';
import { useAuthStore, useDevLogin, useGoogleSignIn } from '@/features/auth';
import { colors, radius, spacing } from '@/theme';

const TEST_ACCOUNTS = [
  { email: 'teacher@test.com', label: 'Teacher', icon: 'school-outline' },
  { email: 'student1@test.com', label: 'Student 1', icon: 'person-outline' },
  { email: 'student2@test.com', label: 'Student 2', icon: 'person-outline' },
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const google = useGoogleSignIn();
  const devLogin = useDevLogin();
  const pendingJoinCode = useAuthStore((s) => s.pendingJoinCode);
  const [customEmail, setCustomEmail] = useState('');
  const [customEmailError, setCustomEmailError] = useState<string | null>(null);

  const busy = google.isPending || devLogin.isPending;

  // The Stack.Protected guards normally move us off this screen once signed in;
  // this is a fallback that only runs if the screen is still mounted.
  const goHome = () => router.replace('/');
  const signInWithEmail = (email: string) => devLogin.mutate({ email }, { onSuccess: goHome });

  const devLoginError = devLogin.error
    ? isApiError(devLogin.error, 'NOT_FOUND')
      ? 'Test login is disabled on this server (ENABLE_DEV_LOGIN=false).'
      : getErrorMessage(devLogin.error)
    : null;
  const googleError = google.error ? getErrorMessage(google.error) : null;

  const signInWithCustomEmail = () => {
    const email = customEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
      setCustomEmailError('Enter a valid email address');
      return;
    }
    setCustomEmailError(null);
    signInWithEmail(email);
  };

  return (
    <Screen scroll keyboardAvoiding edges={['top', 'bottom']} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Ionicons name="school" size={40} color={colors.primaryOn} />
        </View>
        <AppText variant="display" align="center">
          Wide Impact Classroom
        </AppText>
        <AppText variant="body" color={colors.textMuted} align="center">
          Create classes, share a code, and get everyone in the room in seconds.
        </AppText>
      </View>

      {pendingJoinCode ? (
        <InlineMessage tone="info" message="Sign in to join the class you were invited to." />
      ) : null}

      <View style={styles.section}>
        <Button
          title="Continue with Google"
          icon="logo-google"
          size="lg"
          onPress={() => google.mutate(undefined, { onSuccess: (auth) => auth && goHome() })}
          loading={google.isPending}
          disabled={!google.isConfigured || busy}
        />
        {!google.isConfigured ? (
          <AppText variant="caption" align="center">
            Google sign-in isn't configured for this build (set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).
          </AppText>
        ) : null}
        {googleError ? <InlineMessage tone="error" message={googleError} /> : null}
      </View>

      {env.enableDevLogin ? (
        <View style={styles.devSection}>
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <AppText variant="label">TEST ACCOUNTS</AppText>
            <View style={styles.divider} />
          </View>

          <View style={styles.accounts}>
            {TEST_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                title={account.label}
                icon={account.icon}
                variant="outline"
                onPress={() => signInWithEmail(account.email)}
                loading={devLogin.isPending && devLogin.variables?.email === account.email}
                disabled={busy}
                accessibilityLabel={`Sign in as ${account.email}`}
              />
            ))}
          </View>

          <TextField
            label="Or any email"
            placeholder="name@example.com"
            value={customEmail}
            onChangeText={(text) => {
              setCustomEmail(text);
              if (customEmailError) setCustomEmailError(null);
            }}
            error={customEmailError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            returnKeyType="go"
            onSubmitEditing={signInWithCustomEmail}
          />
          <Button
            title="Sign in with email"
            variant="secondary"
            onPress={signInWithCustomEmail}
            loading={devLogin.isPending && !TEST_ACCOUNTS.some((a) => a.email === devLogin.variables?.email)}
            disabled={busy}
          />
          {devLoginError ? <InlineMessage tone="error" message={devLoginError} /> : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', gap: spacing.xl, paddingVertical: spacing.xxl },
  hero: { alignItems: 'center', gap: spacing.md },
  logo: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  section: { gap: spacing.sm },
  devSection: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  divider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.borderStrong },
  accounts: { gap: spacing.sm },
});
