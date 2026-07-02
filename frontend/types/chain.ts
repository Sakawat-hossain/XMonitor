export interface Hop {
  order: number;
  server_id: string;
  server_name: string;
  country: string;
  country_flag: string;
  ip: string;
  role: 'entry' | 'relay' | 'main';
  latency: number;
  status: 'online' | 'offline';
  is_hidden: boolean;
  packet_loss: number;
}

export interface RelayChain {
  id: string;
  name: string;
  description: string;
  hops: Hop[];
  status: 'healthy' | 'degraded' | 'down';
  total_latency: number;
  created_at: string;
}

export interface ChainsResponse {
  success: boolean;
  count: number;
  data: RelayChain[];
}