import { useMutation } from '@tanstack/react-query';

import { authApi } from '@/api/auth';
import type { DevLoginBody } from '@/types/api';

import { useAuthStore } from './authStore';

/** Reviewer test accounts: POST /auth/dev-login (only when the backend enables it). */
export function useDevLogin() {
  const completeSignIn = useAuthStore((s) => s.completeSignIn);
  return useMutation({
    mutationFn: (body: DevLoginBody) => authApi.devLogin(body),
    onSuccess: (auth) => completeSignIn(auth),
  });
}
