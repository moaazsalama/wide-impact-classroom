import type { Role, User, UserEnvelope } from '@/types/api';

import { apiClient } from './client';

export const meApi = {
  async get(): Promise<User> {
    const { data } = await apiClient.get<UserEnvelope>('/me');
    return data.user;
  },

  async setRole(role: Role): Promise<User> {
    const { data } = await apiClient.patch<UserEnvelope>('/me/role', { role });
    return data.user;
  },
};
