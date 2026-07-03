'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Server } from '@/types/server';
import { RelayChain } from '@/types/chain';
import { serversApi } from '@/lib/api/servers';
import { chainsApi } from '@/lib/api/chains';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusDot } from '@/components/shared/status-dot';
import {
  Server as ServerIcon,
  Link2,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
} from 'lucide-react';

function StatCard({
  title,
  value,
  icon: Icon,
  tone,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  tone?: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-9 w-12 mt-1" />
            ) : (
              <p className={`text-3xl font-semibold mt-1 ${tone ?? ''}`}>{value}</p>
            )}
          </div>
          <Icon className={`w-8 h-8 ${tone ?? 'text-muted-foreground'}`} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [servers, setServers] = useState<Server[]>([]);
  const [chains, setChains] = useState<RelayChain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([serversApi.getAll(), chainsApi.getAll()])
      .then(([s, c]) => {
        setServers(s);
        setChains(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const online = servers.filter((s) => s.status === 'online').length;
  const offline = servers.filter((s) => s.status === 'offline').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your monitored infrastructure
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/admin/servers?new=1">
              <Plus className="w-4 h-4 mr-1" /> Add Server
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/chains?new=1">
              <Plus className="w-4 h-4 mr-1" /> Create Chain
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Servers" value={servers.length} icon={ServerIcon} loading={loading} />
        <StatCard title="Online" value={online} icon={CheckCircle2} tone="text-emerald-500" loading={loading} />
        <StatCard title="Offline" value={offline} icon={XCircle} tone="text-red-500" loading={loading} />
        <StatCard title="Active Chains" value={chains.length} icon={Link2} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Servers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              servers.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
                >
                  <span className="font-medium">{s.name}</span>
                  <StatusDot status={s.status} />
                </div>
              ))
            )}
            <Button asChild variant="ghost" size="sm" className="w-full mt-2">
              <Link href="/admin/servers">
                Manage servers <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relay Chains</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : chains.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No chains configured yet.
              </p>
            ) : (
              chains.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground">
                    {c.hops.length} hops · {c.total_latency}ms
                  </span>
                </div>
              ))
            )}
            <Button asChild variant="ghost" size="sm" className="w-full mt-2">
              <Link href="/admin/chains">
                Manage chains <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
