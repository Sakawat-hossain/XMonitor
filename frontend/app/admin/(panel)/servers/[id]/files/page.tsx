'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { RemoteFile } from '@/types/monitoring';
import { filesApi } from '@/lib/api/monitoring';
import { serversApi } from '@/lib/api/servers';
import { tokenStorage } from '@/lib/auth/storage';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, ArrowUp, Download, File, Folder, FolderOpen,
  Loader2, RefreshCw, Trash2, Upload,
} from 'lucide-react';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export default function FileManagerPage() {
  const { id } = useParams<{ id: string }>();
  const [serverName, setServerName] = useState('');
  const [path, setPath] = useState('/');
  const [files, setFiles] = useState<RemoteFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    serversApi.getById(id).then((s) => setServerName(s.name)).catch(() => {});
  }, [id]);

  const load = useCallback(async (targetPath: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await filesApi.list(id, targetPath);
      setPath(data.path);
      setFiles(data.files ?? []);
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      setError(e.response?.data?.error || 'Failed to list directory');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load('/'); }, [load]);

  const parentPath = path === '/' ? null : path.split('/').slice(0, -1).join('/') || '/';

  const upload = async (file: globalThis.File) => {
    setUploading(true);
    try {
      await filesApi.upload(id, path, file);
      toast.success(`Uploaded ${file.name}`);
      load(path);
    } catch (err) {
      const e = err as AxiosError<{ error?: string }>;
      toast.error(e.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/servers">
              <ArrowLeft className="w-4 h-4 mr-1" /> Servers
            </Link>
          </Button>
          <FolderOpen className="w-5 h-5" />
          <h1 className="text-lg font-semibold">Files — {serverName || '…'}</h1>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = '';
            }}
          />
          <Button
            variant="outline" size="sm"
            disabled={uploading || Boolean(error)}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
            Upload here
          </Button>
          <Button variant="outline" size="sm" onClick={() => load(path)}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="font-mono text-sm bg-muted rounded-md px-3 py-1.5">{path}</div>

      {error ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 text-red-500 text-sm px-4 py-3">
          {error}
        </div>
      ) : (
        <div className="border rounded-lg bg-background overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Size</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Modified</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {parentPath !== null && (
                <TableRow className="cursor-pointer" onClick={() => load(parentPath)}>
                  <TableCell colSpan={5}>
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <ArrowUp className="w-4 h-4" /> ..
                    </span>
                  </TableCell>
                </TableRow>
              )}
              {loading ? (
                <TableRow><TableCell colSpan={5}><Skeleton className="h-16 w-full" /></TableCell></TableRow>
              ) : files.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Empty directory
                  </TableCell>
                </TableRow>
              ) : files.map((f) => (
                <TableRow
                  key={f.path}
                  className={f.is_dir ? 'cursor-pointer' : ''}
                  onClick={() => f.is_dir && load(f.path)}
                >
                  <TableCell>
                    <span className="flex items-center gap-2">
                      {f.is_dir
                        ? <Folder className="w-4 h-4 text-blue-500" />
                        : <File className="w-4 h-4 text-muted-foreground" />}
                      {f.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {f.is_dir ? '—' : formatSize(f.size)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{f.mode}</TableCell>
                  <TableCell className="text-xs">{f.mod_time}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1 justify-end">
                      {!f.is_dir && (
                        <a
                          href={filesApi.downloadUrl(id, f.path, tokenStorage.get() ?? '')}
                          download={f.name}
                        >
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Download">
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-red-500" title="Delete"
                        onClick={async () => {
                          try {
                            await filesApi.delete(id, f.path);
                            toast.success(`Deleted ${f.name}`);
                            load(path);
                          } catch (err) {
                            const e = err as AxiosError<{ error?: string }>;
                            toast.error(e.response?.data?.error || 'Delete failed');
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
