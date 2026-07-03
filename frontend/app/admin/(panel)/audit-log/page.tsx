'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ScrollText, Search } from 'lucide-react';

interface AuditEntry {
  id: string;
  username: string;
  action: string;
  detail?: string;
  ip: string;
  timestamp: string;
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    apiClient
      .get('/api/v1/admin/audit-log')
      .then((r) => setEntries(r.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = entries.filter(
    (e) =>
      !query ||
      `${e.username} ${e.action} ${e.ip}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Logins and successful admin write operations (last 1000)
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter by user, action or IP…"
          className="pl-8"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="border rounded-lg bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4}><Skeleton className="h-16 w-full" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                  <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  No audit entries yet.
                </TableCell>
              </TableRow>
            ) : filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-sm whitespace-nowrap">
                  {new Date(e.timestamp).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{e.username}</Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{e.action}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{e.ip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
