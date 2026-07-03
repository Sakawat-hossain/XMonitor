'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { NotificationChannel, ChannelType } from '@/types/monitoring';
import { channelsApi } from '@/lib/api/monitoring';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Send, Trash2 } from 'lucide-react';

// Which config fields each channel type needs
const CHANNEL_FIELDS: Record<ChannelType, { key: string; label: string; placeholder?: string }[]> = {
  telegram: [
    { key: 'bot_token', label: 'Bot token', placeholder: '123456:ABC-DEF…' },
    { key: 'chat_id', label: 'Chat ID', placeholder: '-1001234567890' },
  ],
  discord: [{ key: 'url', label: 'Webhook URL', placeholder: 'https://discord.com/api/webhooks/…' }],
  slack: [{ key: 'url', label: 'Webhook URL', placeholder: 'https://hooks.slack.com/services/…' }],
  webhook: [{ key: 'url', label: 'Webhook URL', placeholder: 'https://example.com/hook' }],
  ntfy: [{ key: 'url', label: 'Topic URL', placeholder: 'https://ntfy.sh/my-topic' }],
  gotify: [
    { key: 'url', label: 'Server URL', placeholder: 'https://gotify.example.com' },
    { key: 'token', label: 'App token' },
  ],
  bark: [{ key: 'url', label: 'Bark URL (incl. key)', placeholder: 'https://api.day.app/yourkey' }],
  email: [
    { key: 'host', label: 'SMTP host', placeholder: 'smtp.gmail.com' },
    { key: 'port', label: 'SMTP port', placeholder: '587' },
    { key: 'username', label: 'Username' },
    { key: 'password', label: 'Password' },
    { key: 'from', label: 'From address' },
    { key: 'to', label: 'To address(es), comma-separated' },
  ],
};

const TYPE_LABELS: Record<ChannelType, string> = {
  telegram: 'Telegram',
  discord: 'Discord',
  slack: 'Slack',
  webhook: 'Generic Webhook',
  ntfy: 'ntfy',
  gotify: 'Gotify',
  bark: 'Bark (iOS)',
  email: 'Email (SMTP)',
};

export default function NotificationsAdminPage() {
  const queryClient = useQueryClient();
  const { data: channels = [], isLoading: loading } = useQuery({
    queryKey: ['channels'],
    queryFn: channelsApi.getAll,
  });
  const reload = () => queryClient.invalidateQueries({ queryKey: ['channels'] });

  const [formOpen, setFormOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Form state (dynamic fields make react-hook-form awkward here)
  const [name, setName] = useState('');
  const [type, setType] = useState<ChannelType>('telegram');
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    const missing = CHANNEL_FIELDS[type].filter((f) => !config[f.key]?.trim());
    if (missing.length > 0) {
      toast.error(`Missing: ${missing.map((m) => m.label).join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      await channelsApi.create({ name, type, config });
      toast.success(`Channel "${name}" added`);
      setName('');
      setConfig({});
      setFormOpen(false);
      reload();
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      toast.error(e.response?.data?.error || 'Failed to add channel');
    } finally {
      setSaving(false);
    }
  };

  const test = async (ch: NotificationChannel) => {
    setTestingId(ch.id);
    try {
      await channelsApi.test(ch.id);
      toast.success(`Test message sent via ${ch.name}`);
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      toast.error(e.response?.data?.error || 'Test failed — check the config');
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Notification Channels</h1>
          <p className="text-sm text-muted-foreground">
            Where alert notifications get delivered
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Channel
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-32 w-full" />
      ) : channels.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No channels yet. Add Telegram, Discord, Slack, email or a webhook —
            then attach it to alert rules.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {channels.map((ch) => (
            <Card key={ch.id}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{ch.name}</p>
                  <Badge variant="outline">{TYPE_LABELS[ch.type]}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm" className="flex-1"
                    disabled={testingId === ch.id}
                    onClick={() => test(ch)}
                  >
                    {testingId === ch.id
                      ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      : <Send className="w-4 h-4 mr-1" />}
                    Send test
                  </Button>
                  <Button
                    variant="outline" size="sm" className="text-red-500"
                    onClick={async () => {
                      await channelsApi.delete(ch.id);
                      toast.success('Channel removed');
                      reload();
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add notification channel</DialogTitle>
            <DialogDescription>Configure where alerts are sent.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ch-name">Name</Label>
              <Input
                id="ch-name" placeholder="Ops Telegram"
                value={name} onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => { setType(v as ChannelType); setConfig({}); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as ChannelType[]).map((t) => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {CHANNEL_FIELDS[type].map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={`cfg-${f.key}`}>{f.label}</Label>
                <Input
                  id={`cfg-${f.key}`}
                  type={f.key === 'password' ? 'password' : 'text'}
                  placeholder={f.placeholder}
                  value={config[f.key] ?? ''}
                  onChange={(e) => setConfig((c) => ({ ...c, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add channel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
