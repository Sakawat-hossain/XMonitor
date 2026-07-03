'use client';

import { useEffect, useRef, useState } from 'react';
import { Server } from '@/types/server';

const WS_URL =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(
    /^http/,
    'ws'
  ) + '/ws';

interface WsMessage {
  type: string;
  data: unknown;
}

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

/**
 * Live server list over WebSocket with automatic reconnection.
 * Falls back gracefully: callers should seed initial data via REST;
 * this hook then keeps it fresh.
 */
export function useLiveServers(onUpdate: (servers: Server[]) => void): WsStatus {
  const [status, setStatus] = useState<WsStatus>('connecting');
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      setStatus('connecting');
      ws = new WebSocket(WS_URL);

      ws.onopen = () => setStatus('connected');
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as WsMessage;
          if (msg.type === 'server_update' && Array.isArray(msg.data)) {
            onUpdateRef.current(msg.data as Server[]);
          }
        } catch {
          // ignore malformed frames
        }
      };
      ws.onclose = () => {
        setStatus('disconnected');
        if (!disposed) {
          retryTimer = setTimeout(connect, 3000);
        }
      };
      ws.onerror = () => ws?.close();
    };

    connect();
    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, []);

  return status;
}
