'use client';

import { Server } from '@/types/server';
import { CountryFlag } from '@/components/ui/country-flag';
import { StatusDot } from '@/components/shared/status-dot';
import { ArrowDown, ArrowUp, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatUptime,
  formatNetwork,
  getUsageColor,
  getUsageBar,
  getRoleAccent,
} from '@/lib/utils/format';

function UsageRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium tabular-nums', getUsageColor(value))}>
          {value.toFixed(0)}%
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', getUsageBar(value))}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

export function ServerCard({ server }: { server: Server }) {
  return (
    <div className="rounded-lg border bg-card p-4 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <CountryFlag country={server.country} className="w-6 h-4 rounded-sm shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate leading-tight">{server.name}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">{server.ip}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusDot status={server.status} />
          <span className={cn('text-xs capitalize', getRoleAccent(server.role))}>
            {server.role}
          </span>
        </div>
      </div>

      {/* Usage bars */}
      <div className="mt-4 space-y-3">
        <UsageRow label="CPU" value={server.cpu} />
        <UsageRow label="Memory" value={server.memory} />
        <UsageRow label="Disk" value={server.disk} />
      </div>

      {/* Footer: network + uptime */}
      <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3 font-mono">
          <span className="flex items-center gap-1">
            <ArrowDown className="w-3 h-3" />
            {formatNetwork(server.network_in)}
          </span>
          <span className="flex items-center gap-1">
            <ArrowUp className="w-3 h-3" />
            {formatNetwork(server.network_out)}
          </span>
        </div>
        <span className="flex items-center gap-1 font-mono">
          <Clock className="w-3 h-3" />
          {formatUptime(server.uptime)}
        </span>
      </div>
    </div>
  );
}
