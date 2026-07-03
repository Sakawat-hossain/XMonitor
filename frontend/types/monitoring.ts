// Types for services, alerts, notification channels, and cron tasks.

export interface CheckResult {
  timestamp: string;
  up: boolean;
  response_time_ms: number;
  status_code?: number;
  error?: string;
}

export interface Service {
  id: string;
  name: string;
  type: 'http' | 'tcp' | 'ping';
  target: string;
  interval_secs: number;
  status: 'up' | 'down' | 'pending';
  response_time_ms: number;
  last_check: string;
  last_error?: string;
  uptime_pct: number;
  history: CheckResult[];
  created_at: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: 'cpu' | 'memory' | 'disk' | 'offline_minutes' | 'service_down';
  threshold: number;
  server_ids: string[] | null;
  channel_ids: string[] | null;
  cooldown_minutes: number;
  enabled: boolean;
  muted: boolean;
  last_fired: string;
  created_at: string;
}

export interface AlertEvent {
  id: string;
  rule_id: string;
  rule_name: string;
  server_id: string;
  message: string;
  value: number;
  timestamp: string;
}

export type ChannelType =
  | 'telegram'
  | 'discord'
  | 'slack'
  | 'webhook'
  | 'ntfy'
  | 'gotify'
  | 'bark'
  | 'email';

export interface NotificationChannel {
  id: string;
  name: string;
  type: ChannelType;
  config: Record<string, string>;
  enabled: boolean;
  created_at: string;
}

export interface CronTask {
  id: string;
  name: string;
  command: string;
  schedule: string;
  server_ids: string[] | null;
  enabled: boolean;
  last_run: string;
  next_run: string;
  created_at: string;
}

export interface CronExecution {
  id: string;
  task_id: string;
  task_name: string;
  status: 'dispatched' | 'no_agent' | 'error';
  output: string;
  manual: boolean;
  timestamp: string;
}

export interface MetricPoint {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network_in: number;
  network_out: number;
}

export interface Probe {
  id: string;
  name: string;
  country: string;
  region: string;
  status: 'online' | 'offline';
  last_seen: string;
}

export interface Reachability {
  server_id: string;
  probe_id: string;
  probe_country: string;
  probe_name: string;
  reachable: boolean;
  latency_ms: number;
  timestamp: string;
}

export interface RemoteFile {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  mode: string;
  mod_time: string;
}
