'use client';

import { useEffect, useState } from 'react';
import { Server } from '@/types/server';
import { serversApi } from '@/lib/api/servers';
import { ServerCard } from '@/components/dashboard/server-card';
import { Activity, Server as ServerIcon, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServers();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchServers, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchServers = async () => {
    try {
      const data = await serversApi.getAll();
      setServers(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch servers. Is the backend running?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onlineCount = servers.filter((s) => s.status === 'online').length;
  const offlineCount = servers.filter((s) => s.status === 'offline').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">XMonitor</h1>
              <p className="text-xs text-muted-foreground">
                Network monitoring & relay management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-muted-foreground">Live</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Servers</p>
                <p className="text-3xl font-bold mt-1">{servers.length}</p>
              </div>
              <ServerIcon className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online</p>
                <p className="text-3xl font-bold mt-1 text-green-500">
                  {onlineCount}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offline</p>
                <p className="text-3xl font-bold mt-1 text-red-500">
                  {offlineCount}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500/50" />
            </div>
          </div>
        </div>

        {/* Servers Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Monitored Servers</h2>

          {loading && (
            <div className="text-center py-12 text-muted-foreground">
              Loading servers...
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-4 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && servers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No servers found. Add your first server!
            </div>
          )}

          {!loading && !error && servers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servers.map((server) => (
                <ServerCard key={server.id} server={server} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}