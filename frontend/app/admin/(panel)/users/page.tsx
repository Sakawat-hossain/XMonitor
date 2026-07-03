'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Copy, KeyRound, Loader2, Plus, Trash2, UserCircle } from 'lucide-react';

interface APIToken {
  id: string;
  name: string;
  prefix: string;
  scope: 'read' | 'full';
  created_at: string;
  last_used: string;
}

export default function UsersTokensPage() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<APIToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [scope, setScope] = useState<'read' | 'full'>('read');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await apiClient.get('/api/v1/admin/tokens');
      setTokens(r.data.data ?? []);
    } catch {
      toast.error('Failed to load tokens');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      const r = await apiClient.post('/api/v1/admin/tokens', { name, scope });
      setNewSecret(r.data.data.token);
      setName('');
      load();
    } catch {
      toast.error('Failed to create token');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users & API Tokens</h1>
        <p className="text-sm text-muted-foreground">
          Panel accounts and programmatic access
        </p>
      </div>

      {/* Current user */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Panel users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between border rounded-md px-4 py-3">
            <div className="flex items-center gap-3">
              <UserCircle className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="font-medium">{user?.username ?? '—'}</p>
                <p className="text-xs text-muted-foreground">
                  Last login:{' '}
                  {user?.last_login_at
                    ? new Date(user.last_login_at).toLocaleString()
                    : '—'}
                </p>
              </div>
            </div>
            <Badge variant="outline">{user?.role ?? 'admin'}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Multi-user support arrives with a persistent database (SQLite).
          </p>
        </CardContent>
      </Card>

      {/* API tokens */}
      <Card>
        <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> API tokens
          </CardTitle>
          <Button size="sm" onClick={() => { setNewSecret(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Generate token
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : tokens.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No API tokens. Generate one to call the API with
              <code className="font-mono text-xs bg-muted px-1 rounded mx-1">
                Authorization: Bearer xmt_…
              </code>
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="font-mono text-xs">{t.prefix}…</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={t.scope === 'full' ? 'text-red-500 border-red-500/30' : ''}>
                        {t.scope}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.last_used && !t.last_used.startsWith('0001')
                        ? new Date(t.last_used).toLocaleString()
                        : 'never'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                        title="Revoke"
                        onClick={async () => {
                          await apiClient.delete(`/api/v1/admin/tokens/${t.id}`);
                          toast.success('Token revoked');
                          load();
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{newSecret ? 'Token created' : 'Generate API token'}</DialogTitle>
            <DialogDescription>
              {newSecret
                ? 'Copy it now — it will not be shown again.'
                : 'Read tokens can only perform GET requests.'}
            </DialogDescription>
          </DialogHeader>
          {newSecret ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs bg-muted rounded-md p-3 break-all">
                  {newSecret}
                </code>
                <Button
                  variant="outline" size="icon" aria-label="Copy token"
                  onClick={() => {
                    navigator.clipboard.writeText(newSecret);
                    toast.success('Copied to clipboard');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Button className="w-full" onClick={() => setFormOpen(false)}>Done</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tok-name">Name</Label>
                <Input id="tok-name" placeholder="ci-bot" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select value={scope} onValueChange={(v) => setScope(v as 'read' | 'full')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="read">read — GET only</SelectItem>
                    <SelectItem value="full">full — all operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={create} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Generate
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
