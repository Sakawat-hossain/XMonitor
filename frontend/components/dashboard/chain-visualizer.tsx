'use client';

import { RelayChain, Hop } from '@/types/chain';
import { StatusDot } from '@/components/shared/status-dot';
import { CountryFlag } from '@/components/ui/country-flag';
import { ArrowDown, Lock, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRoleAccent } from '@/lib/utils/format';

// role → left-border accent (blue entry, violet relay, emerald main)
const ROLE_BORDER: Record<string, string> = {
  entry: 'border-l-blue-500',
  relay: 'border-l-violet-500',
  main: 'border-l-emerald-500',
};

export function ChainVisualizer({ chain }: { chain: RelayChain }) {
  const hiddenCount = chain.hops.filter((h) => h.is_hidden).length;

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium truncate">{chain.name}</p>
            {chain.description && (
              <p className="text-sm text-muted-foreground truncate">{chain.description}</p>
            )}
          </div>
          <StatusDot status={chain.status} />
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          {[
            ['Latency', `${chain.total_latency}ms`],
            ['Hops', String(chain.hops.length)],
            ['Hidden', String(hiddenCount)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hop flow */}
      <div className="p-4 space-y-1">
        {chain.hops.map((hop, i) => (
          <div key={hop.order}>
            <HopRow hop={hop} isLast={i === chain.hops.length - 1} />
            {i < chain.hops.length - 1 && (
              <div className="flex items-center gap-2 pl-5 py-1 text-xs text-muted-foreground">
                <ArrowDown className="w-3.5 h-3.5" />
                <span className="font-mono">{hop.latency}ms</span>
              </div>
            )}
          </div>
        ))}

        {/* Final destination */}
        <div className="flex items-center gap-2 pl-5 py-1 text-xs text-muted-foreground">
          <ArrowDown className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          <Globe className="w-4 h-4" />
          Internet
        </div>
      </div>
    </div>
  );
}

function HopRow({ hop, isLast }: { hop: Hop; isLast: boolean }) {
  return (
    <div
      className={cn(
        'rounded-md border border-l-2 bg-background px-3 py-2.5',
        ROLE_BORDER[hop.role] ?? 'border-l-zinc-400'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium tabular-nums shrink-0">
            {hop.order}
          </span>
          <CountryFlag country={hop.country} className="w-6 h-4 rounded-sm shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{hop.server_name}</p>
            <p className="text-xs text-muted-foreground font-mono truncate flex items-center gap-1">
              {hop.is_hidden ? (
                <>
                  <Lock className="w-3 h-3" /> Hidden from public
                </>
              ) : (
                hop.ip
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={cn('text-xs font-medium uppercase', getRoleAccent(hop.role))}>
            {hop.role}
          </span>
          <StatusDot status={hop.status} label={false} />
        </div>
      </div>

      {!isLast && (
        <div className="mt-2 pt-2 border-t flex justify-between text-xs text-muted-foreground font-mono">
          <span>loss {hop.packet_loss.toFixed(2)}%</span>
          <span>{hop.latency}ms →</span>
        </div>
      )}
    </div>
  );
}
