import { apiClient } from './client';
import { Server, ServersResponse } from '@/types/server';

export const serversApi = {
  // Get all servers
  getAll: async (): Promise<Server[]> => {
    const response = await apiClient.get<ServersResponse>('/api/v1/servers');
    return response.data.data;
  },

  // Get single server
  getById: async (id: string): Promise<Server> => {
    const response = await apiClient.get(`/api/v1/servers/${id}`);
    return response.data.data;
  },

  // Delete server
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/servers/${id}`);
  },
};