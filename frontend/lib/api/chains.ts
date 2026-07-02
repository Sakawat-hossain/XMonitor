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

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/chains/${id}`);
  },
};