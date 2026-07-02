import { apiClient } from './client';
import { User, LoginResponse } from '@/types/auth';

export const authApi = {
  login: async (username: string, password: string) => {
    const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', {
      username,
      password,
    });
    return response.data.data; // { token, user }
  },

  me: async (): Promise<User> => {
    const response = await apiClient.get('/api/v1/auth/me');
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/api/v1/auth/logout');
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    await apiClient.post('/api/v1/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
};
