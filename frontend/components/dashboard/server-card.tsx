'use client';

import { Server } from '@/types/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CountryFlag } from '@/components/ui/country-flag';
import {
  Cpu,
  HardDrive,
  MemoryStick,
  Wifi,
  Clock,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import {
  formatUptime,
  formatNetwork,
  getUsageColor,
  getRoleBadgeColor,
  getStatusColor,
} from '@/lib/utils/format';

interface ServerCardProps {
  server: Server;
}

export function ServerCard({ server }: ServerCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow border-2">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CountryFlag country={server.country} className="w-7 h-5 rounded-sm shadow-sm" />
            <div>
              <CardTitle className="text-lg">{server.name}</CardTitle>
              <p className="text-sm text-muted-foreground font-mono">
                {server.ip}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge
              variant="outline"
              className={getStatusColor(server.status)}
            >
              ● {server.status}
            </Badge>
            <Badge
              variant="outline"
              className={getRoleBadgeColor(server.role)}
            >
              {server.role}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* CPU */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">CPU</span>
          </div>
          <span className={`text-sm font-medium ${getUsageColor(server.cpu)}`}>
            {server.cpu.toFixed(1)}%
          </span>
        </div>

        {/* Memory */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MemoryStick className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Memory</span>
          </div>
          <span className={`text-sm font-medium ${getUsageColor(server.memory)}`}>
            {server.memory.toFixed(1)}%
          </span>
        </div>

        {/* Disk */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Disk</span>
          </div>
          <span className={`text-sm font-medium ${getUsageColor(server.disk)}`}>
            {server.disk.toFixed(1)}%
          </span>
        </div>

        {/* Network */}
        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wifi className="w-4 h-4" />
            <span>Network</span>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <ArrowDown className="w-3 h-3 text-blue-500" />
              <span className="font-mono">{formatNetwork(server.network_in)}</span>
            </div>
            <div className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3 text-green-500" />
              <span className="font-mono">{formatNetwork(server.network_out)}</span>
            </div>
          </div>
        </div>

        {/* Uptime */}
        <div className="border-t pt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Uptime</span>
          </div>
          <span className="text-sm font-mono">{formatUptime(server.uptime)}</span>
        </div>
      </CardContent>
    </Card>
  );
}