'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store';
import type { WsMessage } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

export function useWebSocket(assignmentId?: string) {
  const { updateStatus, updatePaper, setProgress, clearProgress } = useStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout>();
  const reconnectDelay = useRef(1000);
  const mountedRef = useRef(true);

  const subscribe = useCallback(() => {
    if (assignmentId && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', assignmentId }));
    }
  }, [assignmentId]);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(`${WS_URL}/ws`);
      wsRef.current = ws;
      ws.onopen = () => { reconnectDelay.current = 1000; subscribe(); };
      ws.onmessage = (e) => {
        try {
          const msg: WsMessage = JSON.parse(e.data);
          if (msg.type === 'connected') { subscribe(); return; }
          if (msg.type === 'job:progress') {
            updateStatus(msg.assignmentId, 'processing');
            setProgress(msg.assignmentId, { progress: msg.progress, message: msg.message });
          }
          if (msg.type === 'job:complete') {
            updatePaper(msg.assignmentId, msg.paper);
            clearProgress(msg.assignmentId);
          }
          if (msg.type === 'job:failed') {
            updateStatus(msg.assignmentId, 'failed', 'Generation failed');
            clearProgress(msg.assignmentId);
          }
        } catch { /* ignore */ }
      };
      ws.onclose = () => {
        if (!mountedRef.current) return;
        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
          connect();
        }, reconnectDelay.current);
      };
      ws.onerror = () => {};
    } catch { /* ignore */ }
  }, [subscribe, updateStatus, updatePaper, setProgress, clearProgress]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);
}
