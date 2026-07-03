'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Server } from '@/types/server';
import { serversApi } from '@/lib/api/servers';
import { ServerCard } from '@/components/dashboard/server-card';
import { Navbar } from '@/components/layout/navbar';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { MetricCard } from '@/components/shared/metric-card';
import { StatusDot } from '@/components/shared/status-dot';
import { useLiveServers } from '@/lib/ws/hooks';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { ServerOff, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const t = useTranslations('home');
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    serversApi
      .getAll()
      .then((data) => setServers(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const wsStatus = useLiveServers((live) => {
    setServers(live);
    setError(false);
    setLoading(false);
  });

  const online = servers.filter((s) => s.status === 'online').length;
  const offline = servers.filter((s) => s.status === 'offline').length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <PageHeader
          title={t('monitoredServers')}
          description={t('subtitle')}
          actions={
            <StatusDot
              status={wsStatus}
              text={wsStatus === 'connected' ? 'Real-time' : wsStatus}
              pulse={wsStatus === 'connected'}
            />
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label={t('totalServers')} value={servers.length} />
          <MetricCard label={t('online')} value={online} />
          <MetricCard label={t('offline')} value={offline} />
          <MetricCard label="Relay nodes" value={servers.filter((s) => s.role !== 'standalone').length} />
        </div>

        {/* Server grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Servers</h2>

          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-500 px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {t('fetchError')}
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-52 w-full rounded-lg" />
              ))}
            </div>
          ) : servers.length === 0 ? (
            <div className="rounded-lg border bg-card">
              <EmptyState
                icon={ServerOff}
                title={t('empty')}
                description="Register a server in the admin panel to start monitoring it here."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servers.map((server) => (
                <Link key={server.id} href={`/servers/${server.id}`} className="block">
                  <ServerCard server={server} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
