import * as SecureStore from 'expo-secure-store';

import type { User } from '@/types/api';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const KEYS = {
  accessToken: 'auth.accessToken',
  refreshToken: 'auth.refreshToken',
  user: 'auth.user',
} as const;

/**
 * Tokens are persisted in the OS keychain/keystore (SecureStore) and mirrored
 * in memory so the axios interceptor can read them synchronously.
 */
let memoryTokens: Tokens | null = null;

export const tokenStorage = {
  getTokens(): Tokens | null {
    return memoryTokens;
  },

  getAccessToken(): string | null {
    return memoryTokens?.accessToken ?? null;
  },

  getRefreshToken(): string | null {
    return memoryTokens?.refreshToken ?? null;
  },

  async load(): Promise<Tokens | null> {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(KEYS.accessToken),
      SecureStore.getItemAsync(KEYS.refreshToken),
    ]);
    memoryTokens = accessToken && refreshToken ? { accessToken, refreshToken } : null;
    return memoryTokens;
  },

  async save(tokens: Tokens): Promise<void> {
    memoryTokens = tokens;
    await Promise.all([
      SecureStore.setItemAsync(KEYS.accessToken, tokens.accessToken),
      SecureStore.setItemAsync(KEYS.refreshToken, tokens.refreshToken),
    ]);
  },

  /** Last known user, used to restore the UI when the server is unreachable at launch. */
  async loadUser(): Promise<User | null> {
    const raw = await SecureStore.getItemAsync(KEYS.user);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  async saveUser(user: User): Promise<void> {
    await SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
  },

  async clear(): Promise<void> {
    memoryTokens = null;
    await Promise.all(Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key)));
  },
};
