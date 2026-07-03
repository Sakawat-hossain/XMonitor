import { apiClient } from './client';
import {
  Service,
  AlertRule,
  AlertEvent,
  NotificationChannel,
  CronTask,
  CronExecution,
  RemoteFile,
  MetricPoint,
  Probe,
  Reachability,
} from '@/types/monitoring';

export const metricsApi = {
  history: async (serverId: string): Promise<MetricPoint[]> =>
    (await apiClient.get(`/api/v1/servers/${serverId}/metrics`)).data.data ?? [],
  reachability: async (
    serverId: string
  ): Promise<{ reachability: Reachability[]; blocked_countries: string[] | null }> =>
    (await apiClient.get(`/api/v1/servers/${serverId}/reachability`)).data.data,
};

export const probesApi = {
  getAll: async (): Promise<Probe[]> =>
    (await apiClient.get('/api/v1/probes')).data.data ?? [],
  create: async (data: {
    name: string;
    country: string;
    region?: string;
  }): Promise<Probe> =>
    (await apiClient.post('/api/v1/admin/probes', data)).data.data,
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/probes/${id}`);
  },
};

export const servicesApi = {
  getAll: async (): Promise<Service[]> =>
    (await apiClient.get('/api/v1/services')).data.data,
  getById: async (id: string): Promise<Service> =>
    (await apiClient.get(`/api/v1/services/${id}`)).data.data,
  create: async (data: {
    name: string;
    type: string;
    target: string;
    interval_secs: number;
  }): Promise<Service> =>
    (await apiClient.post('/api/v1/admin/services', data)).data.data,
  update: async (id: string, data: Partial<Service>): Promise<Service> =>
    (await apiClient.put(`/api/v1/admin/services/${id}`, data)).data.data,
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/services/${id}`);
  },
};

export const alertsApi = {
  getRules: async (): Promise<AlertRule[]> =>
    (await apiClient.get('/api/v1/admin/alerts/rules')).data.data,
  createRule: async (data: {
    name: string;
    condition: string;
    threshold: number;
    server_ids?: string[];
    channel_ids?: string[];
    cooldown_minutes?: number;
  }): Promise<AlertRule> =>
    (await apiClient.post('/api/v1/admin/alerts/rules', data)).data.data,
  updateRule: async (id: string, data: Partial<AlertRule>): Promise<AlertRule> =>
    (await apiClient.put(`/api/v1/admin/alerts/rules/${id}`, data)).data.data,
  deleteRule: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/alerts/rules/${id}`);
  },
  getEvents: async (): Promise<AlertEvent[]> =>
    (await apiClient.get('/api/v1/admin/alerts/events')).data.data,
};

export const channelsApi = {
  getAll: async (): Promise<NotificationChannel[]> =>
    (await apiClient.get('/api/v1/admin/channels')).data.data,
  create: async (data: {
    name: string;
    type: string;
    config: Record<string, string>;
  }): Promise<NotificationChannel> =>
    (await apiClient.post('/api/v1/admin/channels', data)).data.data,
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/channels/${id}`);
  },
  test: async (id: string): Promise<void> => {
    await apiClient.post(`/api/v1/admin/channels/${id}/test`);
  },
};

export const cronApi = {
  getAll: async (): Promise<CronTask[]> =>
    (await apiClient.get('/api/v1/admin/cron')).data.data,
  create: async (data: {
    name: string;
    command: string;
    schedule: string;
    server_ids?: string[];
  }): Promise<CronTask> =>
    (await apiClient.post('/api/v1/admin/cron', data)).data.data,
  update: async (id: string, data: Partial<CronTask>): Promise<CronTask> =>
    (await apiClient.put(`/api/v1/admin/cron/${id}`, data)).data.data,
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/cron/${id}`);
  },
  trigger: async (id: string): Promise<CronExecution> =>
    (await apiClient.post(`/api/v1/admin/cron/${id}/trigger`)).data.data,
  executions: async (taskId?: string): Promise<CronExecution[]> =>
    (
      await apiClient.get('/api/v1/admin/cron/executions', {
        params: taskId ? { task_id: taskId } : {},
      })
    ).data.data ?? [],
};

export const filesApi = {
  list: async (
    serverId: string,
    path: string
  ): Promise<{ path: string; files: RemoteFile[] }> =>
    (
      await apiClient.get(`/api/v1/admin/servers/${serverId}/files`, {
        params: { path },
      })
    ).data.data,
  downloadUrl: (serverId: string, path: string, token: string): string => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    return `${base}/api/v1/admin/servers/${serverId}/files/download?path=${encodeURIComponent(path)}&token=${encodeURIComponent(token)}`;
  },
  upload: async (serverId: string, path: string, file: File): Promise<void> => {
    const form = new FormData();
    form.append('file', file);
    await apiClient.post(`/api/v1/admin/servers/${serverId}/files/upload`, form, {
      params: { path },
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },
  delete: async (serverId: string, path: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/servers/${serverId}/files`, {
      params: { path },
    });
  },
  rename: async (serverId: string, from: string, to: string): Promise<void> => {
    await apiClient.post(`/api/v1/admin/servers/${serverId}/files/rename`, {
      from,
      to,
    });
  },
};
