'use client';

import { useCallback, useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertRule, AlertEvent, NotificationChannel } from '@/types/monitoring';
import { alertsApi, channelsApi } from '@/lib/api/monitoring';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Bell, BellOff, Loader2, Plus, Trash2 } from 'lucide-react';

const CONDITIONS = [
  { value: 'cpu', label: 'CPU usage (%)' },
  { value: 'memory', label: 'Memory usage (%)' },
  { value: 'disk', label: 'Disk usage (%)' },
  { value: 'offline_minutes', label: 'Offline for (minutes)' },
  { value: 'service_down', label: 'Any service down' },
];

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  condition: z.enum(['cpu', 'memory', 'disk', 'offline_minutes', 'service_down']),
  threshold: z.number(),
  cooldown_minutes: z.number().min(1),
  channel_ids: z.array(z.string()).optional(),
});
type Form = z.infer<typeof schema>;

export default function AlertsAdminPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, e, c] = await Promise.all([
        alertsApi.getRules(),
        alertsApi.getEvents(),
        channelsApi.getAll(),
      ]);
      setRules(r);
      setEvents(e ?? []);
      setChannels(c ?? []);
    } catch {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const {
    register, handleSubmit, control, reset, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { condition: 'cpu', threshold: 90, cooldown_minutes: 10, channel_ids: [] },
  });
  const selectedChannels = watch('channel_ids') ?? [];

  const onSubmit = async (values: Form) => {
    try {
      await alertsApi.createRule(values);
      toast.success(`Rule "${values.name}" created`);
      reset();
      setFormOpen(false);
      load();
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      toast.error(e.response?.data?.error || 'Failed to create rule');
    }
  };

  const toggle = async (rule: AlertRule, field: 'enabled' | 'muted') => {
    try {
      await alertsApi.updateRule(rule.id, { [field]: !rule[field] });
      load();
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-sm text-muted-foreground">
            Rules are evaluated every 30 seconds against live metrics
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Rule
        </Button>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="history">History ({events.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <div className="border rounded-lg bg-background overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Cooldown</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6}><Skeleton className="h-16 w-full" /></TableCell></TableRow>
                ) : rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {r.condition === 'service_down'
                        ? 'service down'
                        : `${r.condition} > ${r.threshold}`}
                    </TableCell>
                    <TableCell className="text-sm">{r.cooldown_minutes}m</TableCell>
                    <TableCell className="text-sm">
                      {(r.channel_ids ?? []).length || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        !r.enabled ? 'text-muted-foreground'
                          : r.muted ? 'text-yellow-500 border-yellow-500/30'
                          : 'text-green-500 border-green-500/30'
                      }>
                        {!r.enabled ? 'disabled' : r.muted ? 'muted' : 'active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          title={r.muted ? 'Unmute' : 'Mute'}
                          onClick={() => toggle(r, 'muted')}
                        >
                          {r.muted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-red-500"
                          title="Delete rule"
                          onClick={async () => {
                            await alertsApi.deleteRule(r.id);
                            toast.success('Rule deleted');
                            load();
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="border rounded-lg bg-background">
            {events.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">
                No alerts have fired yet. 🎉
              </p>
            ) : (
              <div className="divide-y">
                {events.slice(0, 50).map((e) => (
                  <div key={e.id} className="px-4 py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">{e.rule_name}</p>
                      <p className="text-xs text-muted-foreground">{e.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(e.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New alert rule</DialogTitle>
            <DialogDescription>Fire a notification when a threshold is crossed.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Name</Label>
              <Input id="rule-name" placeholder="High CPU" {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Condition</Label>
                <Controller
                  control={control} name="condition"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-threshold">Threshold</Label>
                <Input id="rule-threshold" type="number" step="any" {...register('threshold', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-cooldown">Cooldown (minutes)</Label>
              <Input id="rule-cooldown" type="number" min={1} {...register('cooldown_minutes', { valueAsNumber: true })} />
            </div>
            {channels.length > 0 && (
              <div className="space-y-2">
                <Label>Notify via</Label>
                <div className="space-y-1">
                  {channels.map((ch) => (
                    <label key={ch.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedChannels.includes(ch.id)}
                        onChange={(e) => {
                          setValue(
                            'channel_ids',
                            e.target.checked
                              ? [...selectedChannels, ch.id]
                              : selectedChannels.filter((id) => id !== ch.id)
                          );
                        }}
                      />
                      {ch.name} <Badge variant="outline" className="text-[10px]">{ch.type}</Badge>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create rule
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
