'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { RelayChain } from '@/types/chain';
import { chainsApi } from '@/lib/api/chains';
import { ChainWizardDialog } from '@/components/admin/chain-wizard-dialog';
import { CountryFlag } from '@/components/ui/country-flag';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowRight, Loader2, Pencil, Plus, Radio, Trash2 } from 'lucide-react';

function ChainsPageInner() {
  const searchParams = useSearchParams();
  const [chains, setChains] = useState<RelayChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(searchParams.get('new') === '1');
  const [editing, setEditing] = useState<RelayChain | null>(null);
  const [deleting, setDeleting] = useState<RelayChain | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setChains(await chainsApi.getAll());
    } catch {
      toast.error('Failed to load chains');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const testChain = async (chain: RelayChain) => {
    setTestingId(chain.id);
    try {
      const updated = await chainsApi.test(chain.id);
      setChains((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast.success(`"${chain.name}" tested — total latency ${updated.total_latency}ms`);
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string }>;
      toast.error(axiosErr.response?.data?.error || 'Test failed');
    } finally {
      setTestingId(null);
    }
  };

  const statusTone = {
    healthy: 'bg-green-500/10 text-green-500 border-green-500/20',
    degraded: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    down: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Relay Chains</h1>
          <p className="text-sm text-muted-foreground">
            Multi-hop routes through your infrastructure
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setWizardOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Create New Chain
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : chains.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No chains yet. Create your first relay chain to visualize traffic routes.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {chains.map((chain) => (
            <Card key={chain.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-lg truncate">{chain.name}</CardTitle>
                    {chain.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {chain.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={statusTone[chain.status]}>
                    ● {chain.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Compact hop path */}
                <div className="flex items-center gap-1 flex-wrap">
                  {chain.hops.map((hop, i) => (
                    <div key={hop.order} className="flex items-center gap-1">
                      <div className="flex items-center gap-1.5 border rounded-md px-2 py-1">
                        <CountryFlag country={hop.country} className="w-5 h-3.5 rounded-[2px]" />
                        <span className="text-xs font-medium">{hop.server_name}</span>
                      </div>
                      {i < chain.hops.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{chain.hops.length} hops · {chain.total_latency}ms total</span>
                  <span>
                    {chain.hops.filter((h) => h.is_hidden).length} hidden node(s)
                  </span>
                </div>

                <div className="flex gap-2 pt-1 border-t">
                  <Button
                    variant="outline" size="sm" className="flex-1"
                    disabled={testingId === chain.id}
                    onClick={() => testChain(chain)}
                  >
                    {testingId === chain.id ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Radio className="w-4 h-4 mr-1" />
                    )}
                    Test chain
                  </Button>
                  <Button
                    variant="outline" size="sm" className="flex-1"
                    onClick={() => { setEditing(chain); setWizardOpen(true); }}
                  >
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => setDeleting(chain)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ChainWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        chain={editing}
        onSaved={load}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chain {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The servers in this chain are not affected — only the chain definition is removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await chainsApi.delete(deleting.id);
                  toast.success('Chain deleted');
                  load();
                } catch {
                  toast.error('Failed to delete chain');
                }
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ChainsAdminPage() {
  return (
    <Suspense>
      <ChainsPageInner />
    </Suspense>
  );
}
