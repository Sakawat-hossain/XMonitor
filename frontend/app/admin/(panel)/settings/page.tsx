'use client';

import { useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { tokenStorage } from '@/lib/auth/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Download, Loader2, Save, Upload } from 'lucide-react';

interface Settings {
  site_name: string;
  logo_url: string;
  default_theme: string;
  default_locale: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient
      .get('/api/v1/settings')
      .then((r) => setSettings(r.data.data))
      .catch(() => toast.error('Failed to load settings'));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await apiClient.put('/api/v1/admin/settings', settings);
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const restore = async (file: File) => {
    setRestoring(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const r = await apiClient.post('/api/v1/admin/restore', json);
      const d = r.data.data;
      toast.success(
        `Restored: ${d.servers} servers, ${d.chains} chains, ${d.services} services`
      );
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      toast.error(e.response?.data?.error || 'Restore failed — invalid backup file?');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Site configuration and data management</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Site</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!settings ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="site-name">Site name</Label>
                <Input
                  id="site-name"
                  value={settings.site_name}
                  onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo-url">Logo URL (optional)</Label>
                <Input
                  id="logo-url"
                  placeholder="https://example.com/logo.png"
                  value={settings.logo_url}
                  onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Default theme</Label>
                  <Select
                    value={settings.default_theme}
                    onValueChange={(v) => setSettings({ ...settings, default_theme: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default language</Label>
                  <Select
                    value={settings.default_locale}
                    onValueChange={(v) => setSettings({ ...settings, default_locale: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="zh">中文</SelectItem>
                      <SelectItem value="bn">বাংলা</SelectItem>
                      <SelectItem value="ja">日本語</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save settings
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Backup & Restore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Export servers, chains, services, alert rules, channels, cron tasks,
            probes and settings as JSON. The in-memory store resets on restart —
            export before stopping the backend.
          </p>
          <div className="flex gap-2 flex-wrap">
            <a
              href={`${API_BASE}/api/v1/admin/backup?token=${encodeURIComponent(tokenStorage.get() ?? '')}`}
              download="xmonitor-backup.json"
            >
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" /> Export backup
              </Button>
            </a>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) restore(f);
                e.target.value = '';
              }}
            />
            <Button variant="outline" disabled={restoring} onClick={() => fileRef.current?.click()}>
              {restoring ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Import backup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
