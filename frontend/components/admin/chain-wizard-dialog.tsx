'use client';

import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { Server } from '@/types/server';
import { RelayChain } from '@/types/chain';
import { serversApi } from '@/lib/api/servers';
import { chainsApi } from '@/lib/api/chains';
import { CountryFlag } from '@/components/ui/country-flag';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  X,
} from 'lucide-react';

export function ChainWizardDialog({
  open,
  onOpenChange,
  chain,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the wizard edits this chain; otherwise it creates one */
  chain?: RelayChain | null;
  onSaved: () => void;
}) {
  const isEdit = Boolean(chain);
  const [step, setStep] = useState(1);
  const [servers, setServers] = useState<Server[]>([]);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setName(chain?.name ?? '');
    setDescription(chain?.description ?? '');
    setSelectedIds(chain?.hops.map((h) => h.server_id) ?? []);
    serversApi.getAll().then(setServers).catch(() => toast.error('Failed to load servers'));
  }, [open, chain]);

  const byId = (id: string) => servers.find((s) => s.id === id);
  const available = servers.filter((s) => !selectedIds.includes(s.id));

  const move = (index: number, delta: number) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (isEdit && chain) {
        await chainsApi.update(chain.id, { name, description, server_ids: selectedIds });
        toast.success(`Chain "${name}" updated`);
      } else {
        await chainsApi.create({ name, description, server_ids: selectedIds });
        toast.success(`Chain "${name}" created`);
      }
      onOpenChange(false);
      onSaved();
    } catch (err) {
      const axiosErr = err as AxiosError<{ error?: string }>;
      toast.error(axiosErr.response?.data?.error || 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  const roleFor = (index: number) =>
    index === 0 ? 'entry' : index === selectedIds.length - 1 ? 'main' : 'relay';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit chain' : 'Create relay chain'} — step {step} of 3
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Name your chain and describe its purpose.'}
            {step === 2 && 'Pick servers in traffic order: entry first, main node last.'}
            {step === 3 && 'Review the chain before saving.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chain-name">Name</Label>
              <Input
                id="chain-name"
                placeholder="China-SG-Premium"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chain-desc">Description (optional)</Label>
              <Input
                id="chain-desc"
                placeholder="Optimized route for China users"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">
                Chain order ({selectedIds.length} selected, need ≥ 2)
              </p>
              {selectedIds.length === 0 ? (
                <p className="text-sm text-muted-foreground border border-dashed rounded-md p-4 text-center">
                  Add servers from the list below.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {selectedIds.map((id, i) => {
                    const s = byId(id);
                    if (!s) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 border rounded-md px-2 py-1.5">
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <CountryFlag country={s.country} className="w-5 h-3.5 rounded-[2px]" />
                        <span className="text-sm font-medium flex-1 truncate">{s.name}</span>
                        <Badge variant="outline" className="text-[10px]">{roleFor(i)}</Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === 0}
                          aria-label="Move up" onClick={() => move(i, -1)}>
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === selectedIds.length - 1}
                          aria-label="Move down" onClick={() => move(i, 1)}>
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500"
                          aria-label="Remove" onClick={() => setSelectedIds((p) => p.filter((x) => x !== id))}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {available.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Available servers</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {available.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedIds((p) => [...p, s.id])}
                      className="w-full flex items-center gap-2 border rounded-md px-2 py-1.5 hover:bg-muted transition-colors text-left"
                    >
                      <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                      <CountryFlag country={s.country} className="w-5 h-3.5 rounded-[2px]" />
                      <span className="text-sm flex-1 truncate">{s.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{s.ip}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div>
              <p className="font-semibold">{name}</p>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            <div className="space-y-1">
              {selectedIds.map((id, i) => {
                const s = byId(id);
                if (!s) return null;
                return (
                  <div key={id}>
                    <div className="flex items-center gap-2 border rounded-md px-3 py-2">
                      <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                      <CountryFlag country={s.country} className="w-5 h-3.5 rounded-[2px]" />
                      <span className="text-sm font-medium flex-1">{s.name}</span>
                      <Badge variant="outline" className="text-[10px]">{roleFor(i)}</Badge>
                    </div>
                    {i < selectedIds.length - 1 && (
                      <div className="flex justify-center py-0.5">
                        <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              → Internet (final destination)
            </p>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => (step === 1 ? onOpenChange(false) : setStep(step - 1))}
          >
            {step === 1 ? 'Cancel' : (<><ChevronLeft className="w-4 h-4 mr-1" /> Back</>)}
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && name.trim() === '') || (step === 2 && selectedIds.length < 2)}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create chain'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
