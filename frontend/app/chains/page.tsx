'use client';

import { useQuery } from '@tanstack/react-query';
import { chainsApi } from '@/lib/api/chains';
import { ChainVisualizer } from '@/components/dashboard/chain-visualizer';
import { Navbar } from '@/components/layout/navbar';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { MetricCard } from '@/components/shared/metric-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Waypoints, AlertCircle } from 'lucide-react';

export default function ChainsPage() {
  const { data: chains = [], isLoading: loading, isError: error } = useQuery({
    queryKey: ['chains'],
    queryFn: chainsApi.getAll,
    refetchInterval: 10000,
  });

  const totalHops = chains.reduce((sum, c) => sum + c.hops.length, 0);
  const hiddenNodes = chains.reduce(
    (sum, c) => sum + c.hops.filter((h) => h.is_hidden).length,
    0
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <PageHeader
          title="Relay Chains"
          description="Multi-hop proxy routing across your infrastructure"
        />

        <div className="grid grid-cols-3 gap-4">
          <MetricCard label="Active chains" value={chains.length} />
          <MetricCard label="Total hops" value={totalHops} />
          <MetricCard label="Hidden nodes" value={hiddenNodes} />
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-500 px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            Failed to fetch chains. Is the backend running?
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-80 w-full rounded-lg" />
            ))}
          </div>
        ) : chains.length === 0 ? (
          <div className="rounded-lg border bg-card">
            <EmptyState
              icon={Waypoints}
              title="No relay chains yet"
              description="Create a chain in the admin panel to visualize multi-hop routes here."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {chains.map((chain) => (
              <ChainVisualizer key={chain.id} chain={chain} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
