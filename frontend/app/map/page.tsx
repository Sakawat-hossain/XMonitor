'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Server } from '@/types/server';
import { serversApi } from '@/lib/api/servers';
import { Navbar } from '@/components/layout/navbar';
import { Skeleton } from '@/components/ui/skeleton';

// Leaflet touches `window` at import time — never render it on the server
const WorldMap = dynamic(() => import('@/components/dashboard/world-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-[520px] w-full rounded-lg" />,
});

export default function MapPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    serversApi
      .getAll()
      .then(setServers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">World Map</h2>
          <p className="text-sm text-muted-foreground">
            Server locations by country — green all online, yellow partial, red offline
          </p>
        </div>
        {loading ? (
          <Skeleton className="h-[520px] w-full rounded-lg" />
        ) : (
          <WorldMap servers={servers} />
        )}
      </main>
    </div>
  );
}
