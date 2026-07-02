export interface Server {
  id: string;
  name: string;
  ip: string;
  country: string;
  country_flag: string;
  role: 'entry' | 'relay' | 'main' | 'standalone';
  status: 'online' | 'offline' | 'warning';
  cpu: number;
  memory: number;
  disk: number;
  network_in: number;
  network_out: number;
  uptime: number;
  last_seen: string;
  created_at: string;
  ssh_port?: number;
  ssh_user?: string;
}

export interface ServersResponse {
  success: boolean;
  count: number;
  data: Server[];
}