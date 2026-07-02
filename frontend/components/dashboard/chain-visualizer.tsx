'use client';

import { RelayChain, Hop } from '@/types/chain';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CountryFlag } from '@/components/ui/country-flag';
import { ArrowDown, Lock, Globe, Activity, Zap } from 'lucide-react';

interface ChainVisualizerProps {
  chain: RelayChain;
}

export function ChainVisualizer({ chain }: ChainVisualizerProps) {
  const statusColors = {
    healthy: 'bg-green-500/10 text-green-500 border-green-500/20',
    degraded: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    down: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              {chain.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {chain.description}
            </p>
          </div>
          <Badge variant="outline" className={statusColors[chain.status]}>
            ● {chain.status}
          </Badge>
        </div>

        {/* Total Stats */}
        <div className="flex gap-6 mt-4 pt-4 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Total Latency</p>
            <p className="text-2xl font-bold">{chain.total_latency}ms</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Hops</p>
            <p className="text-2xl font-bold">{chain.hops.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Hidden Nodes</p>
            <p className="text-2xl font-bold">
              {chain.hops.filter((h) => h.is_hidden).length}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {chain.hops.map((hop, index) => (
            <div key={hop.order}>
              <HopCard hop={hop} isLast={index === chain.hops.length - 1} />
              {index < chain.hops.length - 1 && (
                <div className="flex items-center justify-center my-2">
                  <div className="flex flex-col items-center">
                    <ArrowDown className="w-5 h-5 text-muted-foreground animate-pulse" />
                    <span className="text-xs text-muted-foreground font-mono mt-1">
                      {hop.latency}ms
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Final destination - Internet */}
          <div className="flex items-center justify-center mt-2">
            <ArrowDown className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted/50 border-2 border-dashed">
            <Globe className="w-5 h-5 text-blue-500" />
            <span className="font-medium">Internet (Final Destination)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HopCard({ hop, isLast }: { hop: Hop; isLast: boolean }) {
  const roleColors = {
    entry: 'bg-blue-500/10 border-blue-500/30',
    relay: 'bg-purple-500/10 border-purple-500/30',
    main: 'bg-green-500/10 border-green-500/30',
  };

  const roleBadge = {
    entry: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
    relay: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
    main: 'bg-green-500/20 text-green-600 dark:text-green-400',
  };

  return (
    <div
      className={`p-4 rounded-lg border-2 ${roleColors[hop.role]} transition-all hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background border-2 font-bold text-sm">
            {hop.order}
          </div>
          <CountryFlag country={hop.country} className="w-9 h-6 rounded-sm shadow-sm" />
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{hop.server_name}</p>
              {hop.is_hidden && (
                <Lock className="w-3 h-3 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              {hop.is_hidden ? '🔒 Hidden from public' : hop.ip}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <Badge className={roleBadge[hop.role]}>
            {hop.role.toUpperCase()}
          </Badge>
          <div className="flex items-center gap-1 text-xs">
            <Activity className="w-3 h-3" />
            <span
              className={
                hop.status === 'online' ? 'text-green-500' : 'text-red-500'
              }
            >
              {hop.status}
            </span>
          </div>
        </div>
      </div>

      {!isLast && (
        <div className="mt-3 pt-3 border-t flex justify-between text-xs text-muted-foreground">
          <span>Packet loss: {hop.packet_loss.toFixed(2)}%</span>
          <span>Latency to next: {hop.latency}ms</span>
        </div>
      )}
    </div>
  );
}