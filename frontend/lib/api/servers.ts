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

  // Create server (admin, requires auth token)
  create: async (data: {
    name: string;
    ip: string;
    country: string;
    role: string;
  }): Promise<Server> => {
    const response = await apiClient.post('/api/v1/admin/servers', data);
    return response.data.data;
  },

  // Update server (admin, requires auth token)
  update: async (id: string, data: Partial<Server>): Promise<Server> => {
    const response = await apiClient.put(`/api/v1/admin/servers/${id}`, data);
    return response.data.data;
  },

  // Delete server (admin, requires auth token)
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/servers/${id}`);
  },
};