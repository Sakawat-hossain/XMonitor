'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { tokenStorage } from '@/lib/auth/storage';
import { serversApi } from '@/lib/api/servers';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TerminalSquare } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080')
  .replace(/^http/, 'ws');

export default function WebSSHPage() {
  const { id } = useParams<{ id: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [serverName, setServerName] = useState('');
  const [status, setStatus] = useState<'connecting' | 'connected' | 'closed'>('connecting');

  useEffect(() => {
    serversApi.getById(id).then((s) => setServerName(s.name)).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!containerRef.current) return;

    let ws: WebSocket | null = null;
    let disposed = false;

    // xterm touches `window` at import time — load it client-side only
    (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
      ]);
      if (disposed || !containerRef.current) return;

      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
        theme: { background: '#0a0a0a' },
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();

      const onResize = () => fit.fit();
      window.addEventListener('resize', onResize);

      const token = tokenStorage.get() ?? '';
      ws = new WebSocket(
        `${WS_BASE}/api/v1/admin/servers/${id}/ssh?token=${encodeURIComponent(token)}`
      );

      ws.onopen = () => {
        setStatus('connected');
        term.writeln('\x1b[90mConnecting to SSH…\x1b[0m');
        term.focus();
      };
      ws.onmessage = (ev) => term.write(typeof ev.data === 'string' ? ev.data : '');
      ws.onclose = () => {
        setStatus('closed');
        term.writeln('\r\n\x1b[90mConnection closed.\x1b[0m');
      };
      ws.onerror = () => setStatus('closed');

      term.onData((data) => {
        if (ws?.readyState === WebSocket.OPEN) ws.send(data);
      });

      return () => {
        window.removeEventListener('resize', onResize);
        term.dispose();
      };
    })();

    return () => {
      disposed = true;
      ws?.close();
    };
  }, [id]);

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/servers">
              <ArrowLeft className="w-4 h-4 mr-1" /> Servers
            </Link>
          </Button>
          <TerminalSquare className="w-5 h-5" />
          <h1 className="text-lg font-bold">SSH — {serverName || '…'}</h1>
        </div>
        <span className={`text-xs ${
          status === 'connected' ? 'text-green-500'
            : status === 'connecting' ? 'text-yellow-500'
            : 'text-red-500'
        }`}>
          ● {status}
        </span>
      </div>
      <div
        ref={containerRef}
        className="flex-1 min-h-[480px] rounded-lg border-2 bg-[#0a0a0a] p-2"
      />
      <p className="text-xs text-muted-foreground">
        Requires SSH credentials on the server (set via Edit server). Connection
        is proxied through the XMonitor backend.
      </p>
    </div>
  );
}
