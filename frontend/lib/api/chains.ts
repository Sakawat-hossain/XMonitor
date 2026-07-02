import { apiClient } from './client';
import { RelayChain, ChainsResponse } from '@/types/chain';

export const chainsApi = {
  getAll: async (): Promise<RelayChain[]> => {
    const response = await apiClient.get<ChainsResponse>('/api/v1/chains');
    return response.data.data;
  },

  getById: async (id: string): Promise<RelayChain> => {
    const response = await apiClient.get(`/api/v1/chains/${id}`);
    return response.data.data;
  },

  // Create chain (admin, requires auth token)
  create: async (data: {
    name: string;
    description?: string;
    server_ids: string[];
  }): Promise<RelayChain> => {
    const response = await apiClient.post('/api/v1/admin/chains', data);
    return response.data.data;
  },

  // Update chain (admin, requires auth token)
  update: async (
    id: string,
    data: { name?: string; description?: string; server_ids?: string[] }
  ): Promise<RelayChain> => {
    const response = await apiClient.put(`/api/v1/admin/chains/${id}`, data);
    return response.data.data;
  },

  // Test chain — pings each hop, returns refreshed latencies (admin)
  test: async (id: string): Promise<RelayChain> => {
    const response = await apiClient.post(`/api/v1/admin/chains/${id}/test`);
    return response.data.data;
  },

  // Delete chain (admin, requires auth token)
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/chains/${id}`);
  },
};