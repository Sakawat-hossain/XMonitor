'use client';

import { useEffect, useState } from 'react';
import { RelayChain } from '@/types/chain';
import { chainsApi } from '@/lib/api/chains';
import { ChainVisualizer } from '@/components/dashboard/chain-visualizer';
import { Navbar } from '@/components/layout/navbar';
import { Zap, AlertCircle, Plus } from 'lucide-react';

export default function ChainsPage() {
  const [chains, setChains] = useState<RelayChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChains();
    const interval = setInterval(fetchChains, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchChains = async () => {
    try {
      const data = await chainsApi.getAll();
      setChains(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch chains. Is the backend running?');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const healthyCount = chains.filter((c) => c.status === 'healthy').length;
  const totalHops = chains.reduce((sum, c) => sum + c.hops.length, 0);
  const hiddenNodes = chains.reduce(
    (sum, c) => sum + c.hops.filter((h) => h.is_hidden).length,
    0
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Zap className="w-8 h-8 text-blue-500" />
              Relay Chains
            </h1>
            <p className="text-muted-foreground mt-1">
              Multi-hop proxy routing visualization
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />
            New Chain
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border rounded-lg p-6">
            <p className="text-sm text-muted-foreground">Active Chains</p>
            <p className="text-3xl font-bold mt-1">{chains.length}</p>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <p className="text-sm text-muted-foreground">Total Hops</p>
            <p className="text-3xl font-bold mt-1 text-blue-500">{totalHops}</p>
          </div>

          <div className="bg-card border rounded-lg p-6">
            <p className="text-sm text-muted-foreground">Hidden Nodes 🔒</p>
            <p className="text-3xl font-bold mt-1 text-green-500">
              {hiddenNodes}
            </p>
          </div>
        </div>

        {/* Chains List */}
        <div className="space-y-6">
          {loading && (
            <div className="text-center py-12 text-muted-foreground">
              Loading chains...
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && chains.length === 0 && (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No relay chains configured yet.</p>
              <p className="text-sm mt-1">Click "New Chain" to create your first one.</p>
            </div>
          )}

          {!loading && !error && chains.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {chains.map((chain) => (
                <ChainVisualizer key={chain.id} chain={chain} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}