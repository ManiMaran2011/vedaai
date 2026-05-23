import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { WsMessage } from '../types.js';

let wss: WebSocketServer;
const subs = new Map<string, Set<WebSocket>>();

export function initWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'connected' }));

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'subscribe' && msg.assignmentId) {
          if (!subs.has(msg.assignmentId)) subs.set(msg.assignmentId, new Set());
          subs.get(msg.assignmentId)!.add(ws);
        }
      } catch { /* ignore */ }
    });

    ws.on('close', () => subs.forEach(s => s.delete(ws)));
    ws.on('error', () => {});
  });

  console.log('  → WebSocket ready on /ws');
}

export function broadcast(assignmentId: string, msg: WsMessage) {
  const clients = subs.get(assignmentId);
  if (!clients) return;
  const payload = JSON.stringify(msg);
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  });
}
