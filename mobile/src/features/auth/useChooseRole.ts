import { useMutation } from '@tanstack/react-query';

import { isApiError } from '@/api/errors';
import { meApi } from '@/api/me';
import type { Role } from '@/types/api';

import { useAuthStore } from './authStore';

export function useChooseRole() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: async (role: Role) => {
      try {
        return await meApi.setRole(role);
      } catch (error) {
        // Role was set elsewhere (another device): adopt the server's truth.
        if (isApiError(error, 'ROLE_ALREADY_SET')) return meApi.get();
        throw error;
      }
    },
    onSuccess: (user) => setUser(user),
  });
}
