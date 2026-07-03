'use client';

import { useEffect, useState } from 'react';
import { Service } from '@/types/monitoring';
import { servicesApi } from '@/lib/api/monitoring';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, AlertTriangle, Globe } from 'lucide-react';

function HistoryBars({ service }: { service: Service }) {
  // One bar per stored check, oldest → newest (up to ~2h of 30–60s checks)
  const checks = service.history.slice(-60);
  return (
    <div className="flex items-stretch gap-[3px] h-8" aria-label="Check history">
      {checks.length === 0 ? (
        <span className="text-xs text-muted-foreground self-center">
          Awaiting first check…
        </span>
      ) : (
        checks.map((r, i) => (
          <div
            key={i}
            className={`flex-1 max-w-2 rounded-sm ${
              r.up ? 'bg-green-500' : 'bg-red-500'
            } hover:opacity-70 transition-opacity`}
            title={`${new Date(r.timestamp).toLocaleTimeString()} — ${
              r.up ? `up, ${r.response_time_ms}ms` : `down: ${r.error ?? ''}`
            }`}
          />
        ))
      )}
    </div>
  );
}

export default function ServiceStatusPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      servicesApi
        .getAll()
        .then(setServices)
        .catch(() => {})
        .finally(() => setLoading(false));
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const allUp = services.length > 0 && services.every((s) => s.status !== 'down');
  const downCount = services.filter((s) => s.status === 'down').length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        {/* Overall banner */}
        {!loading && services.length > 0 && (
          <div
            className={`rounded-lg border-2 p-5 flex items-center gap-3 ${
              allUp
                ? 'border-green-500/30 bg-green-500/5'
                : 'border-red-500/30 bg-red-500/5'
            }`}
          >
            {allUp ? (
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            ) : (
              <AlertTriangle className="w-7 h-7 text-red-500" />
            )}
            <div>
              <p className="font-semibold text-lg">
                {allUp
                  ? 'All systems operational'
                  : `${downCount} service${downCount > 1 ? 's' : ''} down`}
              </p>
              <p className="text-sm text-muted-foreground">
                Live checks refresh automatically
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : services.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No services are being monitored yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {services.map((s) => (
              <Card key={s.id}>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          s.status === 'up'
                            ? 'bg-green-500'
                            : s.status === 'down'
                            ? 'bg-red-500'
                            : 'bg-muted-foreground'
                        }`}
                      />
                      <p className="font-medium truncate">{s.name}</p>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {s.type}
                      </Badge>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono">
                        {s.history.length ? `${s.uptime_pct.toFixed(2)}%` : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.status === 'up' ? `${s.response_time_ms}ms` : s.status}
                      </p>
                    </div>
                  </div>
                  <HistoryBars service={s} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
