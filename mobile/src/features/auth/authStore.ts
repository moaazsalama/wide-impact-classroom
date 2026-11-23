import { create } from 'zustand';

import { authApi } from '@/api/auth';
import { registerSessionHandlers } from '@/api/client';
import { toApiError } from '@/api/errors';
import { meApi } from '@/api/me';
import { queryClient } from '@/lib/queryClient';
import type { AuthResponse, User } from '@/types/api';

import { signOutFromGoogle } from './googleSignIn';
import { tokenStorage } from './tokenStorage';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  /** Join code received via deep link before the user was ready to join (signed out / no role). */
  pendingJoinCode: string | null;

  bootstrap: () => Promise<void>;
  completeSignIn: (auth: AuthResponse) => Promise<void>;
  setUser: (user: User) => void;
  signOut: () => Promise<void>;
  /** Clears local session state without calling the server (e.g. refresh token rejected). */
  clearSession: () => Promise<void>;
  setPendingJoinCode: (code: string | null) => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'loading',
  user: null,
  pendingJoinCode: null,

  bootstrap: async () => {
    try {
      const tokens = await tokenStorage.load();
      if (!tokens) {
        set({ status: 'signedOut', user: null });
        return;
      }
      try {
        // Goes through the interceptor, so an expired access token is refreshed transparently.
        const user = await meApi.get();
        await tokenStorage.saveUser(user);
        set({ status: 'signedIn', user });
      } catch (error) {
        const apiError = toApiError(error);
        const cachedUser = await tokenStorage.loadUser();
        if (apiError.isNetworkError && cachedUser) {
          // Offline at launch: keep the session, screens will show retryable errors.
          set({ status: 'signedIn', user: cachedUser });
          return;
        }
        if (apiError.isNetworkError) {
          set({ status: 'signedOut', user: null });
          return;
        }
        await get().clearSession();
      }
    } catch {
      set({ status: 'signedOut', user: null });
    }
  },

  completeSignIn: async (auth) => {
    queryClient.clear();
    await tokenStorage.save({ accessToken: auth.accessToken, refreshToken: auth.refreshToken });
    await tokenStorage.saveUser(auth.user);
    set({ status: 'signedIn', user: auth.user });
  },

  setUser: (user) => {
    set({ user });
    void tokenStorage.saveUser(user);
  },

  signOut: async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    // Best-effort: revoke the refresh token server side and drop the Google session.
    await Promise.allSettled([
      refreshToken ? authApi.logout(refreshToken) : Promise.resolve(),
      signOutFromGoogle(),
    ]);
    await get().clearSession();
  },

  clearSession: async () => {
    await tokenStorage.clear();
    queryClient.clear();
    set({ status: 'signedOut', user: null });
  },

  setPendingJoinCode: (code) => set({ pendingJoinCode: code }),
}));

registerSessionHandlers({
  onRefreshed: async (auth) => {
    await tokenStorage.saveUser(auth.user);
    useAuthStore.setState({ user: auth.user });
  },
  onSessionExpired: () => useAuthStore.getState().clearSession(),
});

/** Convenience selectors. */
export const useCurrentUser = () => useAuthStore((s) => s.user);
export const useAuthStatus = () => useAuthStore((s) => s.status);
