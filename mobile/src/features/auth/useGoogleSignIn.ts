import { useMutation } from '@tanstack/react-query';

import { authApi } from '@/api/auth';
import type { AuthResponse } from '@/types/api';

import { useAuthStore } from './authStore';
import { getGoogleIdToken, isGoogleSignInConfigured } from './googleSignIn';

class GoogleFlowError extends Error {}

/**
 * Native Google sign-in -> POST /auth/google -> store session.
 * Resolves to `null` when the user cancels the Google sheet.
 */
export function useGoogleSignIn() {
  const completeSignIn = useAuthStore((s) => s.completeSignIn);

  const mutation = useMutation({
    mutationFn: async (): Promise<AuthResponse | null> => {
      const result = await getGoogleIdToken();
      if (result.type === 'cancelled') return null;
      if (result.type === 'error') throw new GoogleFlowError(result.message);
      return authApi.googleLogin({ idToken: result.idToken });
    },
    onSuccess: async (auth) => {
      if (auth) await completeSignIn(auth);
    },
  });

  return { ...mutation, isConfigured: isGoogleSignInConfigured };
}
