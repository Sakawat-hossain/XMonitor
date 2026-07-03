'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import cronstrue from 'cronstrue';
import { CronTask, CronExecution } from '@/types/monitoring';
import { cronApi } from '@/lib/api/monitoring';
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
import { Clock, Loader2, Play, Plus, Power, Trash2 } from 'lucide-react';

function humanSchedule(expr: string): string {
  try {
    return cronstrue.toString(expr);
  } catch {
    return expr;
  }
}

export default function CronAdminPage() {
  const [tasks, setTasks] = useState<CronTask[]>([]);
  const [executions, setExecutions] = useState<CronExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [schedule, setSchedule] = useState('0 3 * * *');
  const [saving, setSaving] = useState(false);

  const schedulePreview = useMemo(() => humanSchedule(schedule), [schedule]);

  const load = useCallback(async () => {
    try {
      const [t, e] = await Promise.all([cronApi.getAll(), cronApi.executions()]);
      setTasks(t ?? []);
      setExecutions(e ?? []);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!name.trim() || !command.trim()) {
      toast.error('Name and command are required');
      return;
    }
    setSaving(true);
    try {
      await cronApi.create({ name, command, schedule });
      toast.success(`Task "${name}" scheduled`);
      setName(''); setCommand('');
      setFormOpen(false);
      load();
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      toast.error(e.response?.data?.error || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Scheduled Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Commands dispatched to agents on a cron schedule
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Task
        </Button>
      </div>

      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 text-yellow-600 dark:text-yellow-400 text-sm px-4 py-2">
        The agent component isn&apos;t installed on any server yet, so runs are
        recorded as <code className="font-mono">no_agent</code>. Scheduling and
        history work end-to-end.
      </div>

      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="history">Run history ({executions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks">
          <div className="border rounded-lg bg-background overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Next run</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5}><Skeleton className="h-16 w-full" /></TableCell></TableRow>
                ) : tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No scheduled tasks yet.
                    </TableCell>
                  </TableRow>
                ) : tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate max-w-64">
                        $ {t.command}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{t.schedule}</div>
                      <div className="text-xs text-muted-foreground">{humanSchedule(t.schedule)}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {t.enabled ? new Date(t.next_run).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={t.enabled ? 'text-emerald-500 border-emerald-500/30' : 'text-muted-foreground'}>
                        {t.enabled ? 'enabled' : 'disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8" title="Run now"
                          onClick={async () => {
                            await cronApi.trigger(t.id);
                            toast.info(`"${t.name}" triggered`);
                            load();
                          }}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          title={t.enabled ? 'Disable' : 'Enable'}
                          onClick={async () => {
                            await cronApi.update(t.id, { enabled: !t.enabled });
                            load();
                          }}
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-red-500" title="Delete"
                          onClick={async () => {
                            await cronApi.delete(t.id);
                            toast.success('Task deleted');
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
            {executions.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">No runs yet.</p>
            ) : (
              <div className="divide-y">
                {executions.slice(0, 50).map((e) => (
                  <div key={e.id} className="px-4 py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">
                        {e.task_name}
                        {e.manual && <Badge variant="outline" className="ml-2 text-[10px]">manual</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">{e.output}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className={
                        e.status === 'dispatched' ? 'text-emerald-500' : 'text-amber-500'
                      }>
                        {e.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(e.timestamp).toLocaleString()}
                      </p>
                    </div>
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
            <DialogTitle>New scheduled task</DialogTitle>
            <DialogDescription>Standard 5-field cron expression.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-name">Name</Label>
              <Input id="task-name" placeholder="Nightly cleanup" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-cmd">Command</Label>
              <Input id="task-cmd" placeholder="apt update && apt upgrade -y" className="font-mono" value={command} onChange={(e) => setCommand(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-schedule">Schedule</Label>
              <Input id="task-schedule" placeholder="0 3 * * *" className="font-mono" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
              <p className="text-xs text-muted-foreground">{schedulePreview}</p>
            </div>
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Schedule task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
