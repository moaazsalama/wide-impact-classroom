import type { AuthResponse, DevLoginBody, GoogleLoginBody } from '@/types/api';

import { apiClient } from './client';

export const authApi = {
  async googleLogin(body: GoogleLoginBody): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/google', body, { skipAuthRefresh: true });
    return data;
  },

  async devLogin(body: DevLoginBody): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/dev-login', body, { skipAuthRefresh: true });
    return data;
  },

  async logout(refreshToken: string): Promise<void> {
    await apiClient.post('/auth/logout', { refreshToken }, { skipAuthRefresh: true });
  },
};
