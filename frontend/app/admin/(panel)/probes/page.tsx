'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { probesApi } from '@/lib/api/monitoring';
import { CountryFlag } from '@/components/ui/country-flag';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Plus, Radar, Trash2 } from 'lucide-react';

export default function ProbesAdminPage() {
  const queryClient = useQueryClient();
  const { data: probes = [], isLoading: loading } = useQuery({
    queryKey: ['probes'],
    queryFn: probesApi.getAll,
  });
  const reload = () => queryClient.invalidateQueries({ queryKey: ['probes'] });

  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || country.trim().length !== 2) {
      toast.error('Name and a 2-letter country code are required');
      return;
    }
    setSaving(true);
    try {
      await probesApi.create({ name, country: country.toUpperCase(), region });
      toast.success(`Probe "${name}" registered`);
      setName(''); setCountry(''); setRegion('');
      setFormOpen(false);
      reload();
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      toast.error(e.response?.data?.error || 'Failed to add probe');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Probe Nodes</h1>
          <p className="text-sm text-muted-foreground">
            Geo-distributed vantage points that test server reachability —
            powering &quot;Blocked in [country]&quot; detection
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Probe
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {probes.map((p) => (
            <Card key={p.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CountryFlag country={p.country} className="w-7 h-5 rounded-sm shadow-sm" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.country}{p.region ? ` · ${p.region}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge
                      variant="outline"
                      className={p.status === 'online' ? 'text-emerald-500 border-emerald-500/30' : 'text-red-500'}
                    >
                      <Radar className="w-3 h-3 mr-1" /> {p.status}
                    </Badge>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                      aria-label={`Delete ${p.name}`}
                      onClick={async () => {
                        await probesApi.delete(p.id);
                        toast.success('Probe removed');
                        reload();
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Register probe node</DialogTitle>
            <DialogDescription>
              A vantage point that will test reachability of all servers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="probe-name">Name</Label>
              <Input id="probe-name" placeholder="Seoul Probe" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="probe-country">Country code</Label>
                <Input id="probe-country" placeholder="KR" maxLength={2} value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="probe-region">Region</Label>
                <Input id="probe-region" placeholder="Seoul" value={region} onChange={(e) => setRegion(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Register probe
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
