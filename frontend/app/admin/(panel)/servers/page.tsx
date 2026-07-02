'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { Server } from '@/types/server';
import { serversApi } from '@/lib/api/servers';
import { ServerFormDialog } from '@/components/admin/server-form-dialog';
import { CountryFlag } from '@/components/ui/country-flag';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatUptime } from '@/lib/utils/format';
import { Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';

const PAGE_SIZES = [10, 25, 50, 100];

function ServersPageInner() {
  const searchParams = useSearchParams();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [query, setQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dialogs
  const [formOpen, setFormOpen] = useState(searchParams.get('new') === '1');
  const [editing, setEditing] = useState<Server | null>(null);
  const [deleting, setDeleting] = useState<Server | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const load = useCallback(async () => {
    try {
      setServers(await serversApi.getAll());
    } catch {
      toast.error('Failed to load servers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const countries = useMemo(
    () => Array.from(new Set(servers.map((s) => s.country))).sort(),
    [servers]
  );

  const filtered = useMemo(() => {
    return servers.filter((s) => {
      if (query && !`${s.name} ${s.ip}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      if (countryFilter !== 'all' && s.country !== countryFilter) return false;
      if (roleFilter !== 'all' && s.role !== roleFilter) return false;
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      return true;
    });
  }, [servers, query, countryFilter, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const doDelete = async (ids: string[]) => {
    const results = await Promise.allSettled(ids.map((id) => serversApi.delete(id)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      const firstError = results.find(
        (r): r is PromiseRejectedResult => r.status === 'rejected'
      )?.reason as AxiosError<{ error?: string }>;
      toast.error(
        firstError?.response?.data?.error ||
          `Failed to delete ${failed} server${failed > 1 ? 's' : ''}`
      );
    } else {
      toast.success(ids.length > 1 ? `${ids.length} servers deleted` : 'Server deleted');
    }
    setSelected(new Set());
    load();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allPageSelected = pageItems.length > 0 && pageItems.every((s) => selected.has(s.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Servers</h1>
          <p className="text-sm text-muted-foreground">
            {servers.length} registered · {filtered.length} shown
          </p>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setBulkConfirm(true)}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete {selected.size}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Server
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or IP…"
            className="pl-8"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={countryFilter} onValueChange={(v) => { setCountryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {['entry', 'relay', 'main', 'standalone'].map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {['online', 'offline', 'warning'].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-background overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input
                  type="checkbox"
                  aria-label="Select all on page"
                  checked={allPageSelected}
                  onChange={() => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (allPageSelected) pageItems.forEach((s) => next.delete(s.id));
                      else pageItems.forEach((s) => next.add(s.id));
                      return next;
                    });
                  }}
                />
              </TableHead>
              <TableHead>Server</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">CPU</TableHead>
              <TableHead className="text-right">Mem</TableHead>
              <TableHead className="text-right">Disk</TableHead>
              <TableHead>Uptime</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={10}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))
            ) : pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-10">
                  No servers match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Select ${s.name}`}
                      checked={selected.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{s.ip}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <CountryFlag country={s.country} className="w-5 h-3.5 rounded-[2px]" />
                      <span className="text-xs">{s.country}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{s.role}</Badge></TableCell>
                  <TableCell>
                    <span className={
                      s.status === 'online' ? 'text-green-500'
                        : s.status === 'warning' ? 'text-yellow-500'
                        : 'text-red-500'
                    }>
                      ● {s.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{s.cpu.toFixed(0)}%</TableCell>
                  <TableCell className="text-right font-mono text-sm">{s.memory.toFixed(0)}%</TableCell>
                  <TableCell className="text-right font-mono text-sm">{s.disk.toFixed(0)}%</TableCell>
                  <TableCell className="text-sm">{formatUptime(s.uptime)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        aria-label={`Edit ${s.name}`}
                        onClick={() => { setEditing(s); setFormOpen(true); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600"
                        aria-label={`Delete ${s.name}`}
                        onClick={() => setDeleting(s)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
            Next
          </Button>
        </div>
      </div>

      <ServerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        server={editing}
        onSaved={load}
      />

      {/* Single delete confirmation */}
      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the server and its monitoring data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => { if (deleting) doDelete([deleting.id]); setDeleting(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkConfirm} onOpenChange={setBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} servers?</AlertDialogTitle>
            <AlertDialogDescription>
              All selected servers will be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => { doDelete(Array.from(selected)); setBulkConfirm(false); }}
            >
              Delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ServersPage() {
  return (
    <Suspense>
      <ServersPageInner />
    </Suspense>
  );
}
