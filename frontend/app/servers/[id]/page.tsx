'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Server } from '@/types/server';
import { MetricPoint, Reachability } from '@/types/monitoring';
import { serversApi } from '@/lib/api/servers';
import { metricsApi } from '@/lib/api/monitoring';
import { Navbar } from '@/components/layout/navbar';
import { CountryFlag } from '@/components/ui/country-flag';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusDot } from '@/components/shared/status-dot';
import { Skeleton } from '@/components/ui/skeleton';
import { formatUptime } from '@/lib/utils/format';
import { ArrowLeft, Ban, CheckCircle2, ShieldAlert } from 'lucide-react';

function MetricChart({
  title, data, dataKey, color, unit,
}: {
  title: string;
  data: MetricPoint[];
  dataKey: keyof MetricPoint;
  color: string;
  unit: string;
}) {
  const chartData = data.map((p) => ({
    time: new Date(p.timestamp).toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }),
    value: Math.round((p[dataKey] as number) * 10) / 10,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-44">
        {chartData.length < 2 ? (
          <p className="text-xs text-muted-foreground pt-10 text-center">
            Collecting data…
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} minTickGap={40} />
              <YAxis tick={{ fontSize: 10 }} unit={unit} width={52} />
              <Tooltip
                formatter={(v) => [`${v}${unit}`, title]}
                contentStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone" dataKey="value" stroke={color}
                strokeWidth={2} dot={false} isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default function ServerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [server, setServer] = useState<Server | null>(null);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [reach, setReach] = useState<Reachability[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [srv, hist, r] = await Promise.all([
          serversApi.getById(id),
          metricsApi.history(id),
          metricsApi.reachability(id),
        ]);
        setServer(srv);
        setMetrics(hist);
        setReach(r.reachability ?? []);
        setBlocked(r.blocked_countries ?? []);
      } catch {
        // server may not exist; keep skeleton off
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> All servers
        </Link>

        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : !server ? (
          <p className="text-muted-foreground py-12 text-center">Server not found.</p>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <CountryFlag country={server.country} className="w-10 h-7 rounded shadow-sm" />
                <div>
                  <h1 className="text-2xl font-semibold">{server.name}</h1>
                  <p className="text-sm text-muted-foreground font-mono">{server.ip}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <StatusDot status={server.status} />
                <Badge variant="outline">{server.role}</Badge>
                {blocked.map((c) => (
                  <Badge
                    key={c}
                    variant="outline"
                    className="gap-1 text-red-600 dark:text-red-500 border-red-500/30"
                  >
                    <Ban className="w-3 h-3" /> Blocked in {c}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                ['CPU', `${server.cpu.toFixed(1)}%`],
                ['Memory', `${server.memory.toFixed(1)}%`],
                ['Disk', `${server.disk.toFixed(1)}%`],
                ['Uptime', formatUptime(server.uptime)],
              ].map(([label, value]) => (
                <div key={label} className="bg-card border rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-semibold mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Live charts */}
            <div>
              <h2 className="text-lg font-semibold mb-3">
                Live metrics
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  last {metrics.length} samples · 5s interval
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricChart title="CPU" data={metrics} dataKey="cpu" color="#3b82f6" unit="%" />
                <MetricChart title="Memory" data={metrics} dataKey="memory" color="#8b5cf6" unit="%" />
                <MetricChart title="Network In" data={metrics} dataKey="network_in" color="#10b981" unit="" />
                <MetricChart title="Network Out" data={metrics} dataKey="network_out" color="#f59e0b" unit="" />
              </div>
            </div>

            {/* Reachability matrix */}
            <div>
              <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> Geo reachability
              </h2>
              <p className="text-sm text-muted-foreground mb-3">
                Whether probe nodes around the world can reach this server
              </p>
              {reach.length === 0 ? (
                <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">
                  Waiting for the first probe cycle…
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {reach.map((r) => (
                    <div
                      key={r.probe_id}
                      className={`border rounded-lg p-3 text-center ${
                        r.reachable
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-red-500/30 bg-red-500/5'
                      }`}
                    >
                      <div className="flex justify-center mb-1">
                        <CountryFlag country={r.probe_country} className="w-6 h-4 rounded-[2px]" />
                      </div>
                      <p className="text-xs font-medium truncate">{r.probe_name}</p>
                      {r.reachable ? (
                        <p className="text-xs text-emerald-500 flex items-center justify-center gap-1 mt-1">
                          <CheckCircle2 className="w-3 h-3" /> {r.latency_ms}ms
                        </p>
                      ) : (
                        <p className="text-xs text-red-500 flex items-center justify-center gap-1 mt-1">
                          <Ban className="w-3 h-3" /> blocked
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
