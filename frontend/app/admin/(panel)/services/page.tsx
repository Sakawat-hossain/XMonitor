'use client';

import { useCallback, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Service } from '@/types/monitoring';
import { servicesApi } from '@/lib/api/monitoring';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Globe, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['http', 'tcp', 'ping']),
  target: z.string().min(1, 'Target is required'),
  interval_secs: z.number().min(30, 'Minimum 30 seconds'),
});
type Form = z.infer<typeof schema>;

const TARGET_HINT: Record<string, string> = {
  http: 'https://example.com',
  tcp: 'host:port  (e.g. 1.1.1.1:53)',
  ping: 'hostname or IP',
};

function Sparkline({ history }: { history: Service['history'] }) {
  const recent = history.slice(-30);
  if (recent.length === 0) return <span className="text-xs text-muted-foreground">no data</span>;
  return (
    <div className="flex items-end gap-px h-6" aria-label="Recent checks">
      {recent.map((r, i) => (
        <div
          key={i}
          title={`${r.up ? `${r.response_time_ms}ms` : r.error || 'down'}`}
          className={`w-1.5 rounded-sm ${r.up ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ height: r.up ? `${Math.min(100, 20 + r.response_time_ms / 20)}%` : '100%' }}
        />
      ))}
    </div>
  );
}

export default function ServicesAdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Service | null>(null);

  const load = useCallback(async () => {
    try {
      setServices(await servicesApi.getAll());
    } catch {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const {
    register, handleSubmit, control, reset, watch,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'http', interval_secs: 60 },
  });
  const watchType = watch('type');

  const onSubmit = async (values: Form) => {
    try {
      await servicesApi.create(values);
      toast.success(`Monitoring "${values.name}"`);
      reset({ name: '', type: 'http', target: '', interval_secs: 60 });
      setFormOpen(false);
      load();
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      toast.error(e.response?.data?.error || 'Failed to create service');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Service Monitoring</h1>
          <p className="text-sm text-muted-foreground">
            HTTP, TCP and ping probes — checked automatically on their interval
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Monitor
          </Button>
        </div>
      </div>

      <div className="border rounded-lg bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Response</TableHead>
              <TableHead className="text-right">Uptime</TableHead>
              <TableHead>Recent checks</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7}><Skeleton className="h-16 w-full" /></TableCell></TableRow>
            ) : services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No monitors yet — add your first HTTP, TCP or ping check.
                </TableCell>
              </TableRow>
            ) : (
              services.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate max-w-56">
                      {s.target}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{s.type}</Badge></TableCell>
                  <TableCell>
                    <span className={
                      s.status === 'up' ? 'text-green-500'
                        : s.status === 'down' ? 'text-red-500'
                        : 'text-muted-foreground'
                    }>
                      ● {s.status}
                    </span>
                    {s.status === 'down' && s.last_error && (
                      <p className="text-xs text-red-400 truncate max-w-48">{s.last_error}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {s.status === 'pending' ? '—' : `${s.response_time_ms}ms`}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {s.history.length ? `${s.uptime_pct.toFixed(1)}%` : '—'}
                  </TableCell>
                  <TableCell><Sparkline history={s.history} /></TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      aria-label={`Delete ${s.name}`}
                      onClick={() => setDeleting(s)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add monitor</DialogTitle>
            <DialogDescription>Probe an endpoint on a fixed interval.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="svc-name">Name</Label>
              <Input id="svc-name" placeholder="My API" {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Controller
                  control={control} name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="http">HTTP(S)</SelectItem>
                        <SelectItem value="tcp">TCP port</SelectItem>
                        <SelectItem value="ping">Ping</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-interval">Interval (secs)</Label>
                <Input id="svc-interval" type="number" min={30} {...register('interval_secs', { valueAsNumber: true })} />
                {errors.interval_secs && (
                  <p className="text-xs text-red-500">{errors.interval_secs.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-target">Target</Label>
              <Input id="svc-target" placeholder={TARGET_HINT[watchType]} {...register('target')} />
              {errors.target && <p className="text-xs text-red-500">{errors.target.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Start monitoring
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop monitoring {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Check history will be lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await servicesApi.delete(deleting.id);
                  toast.success('Monitor removed');
                  load();
                } catch {
                  toast.error('Failed to delete');
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
