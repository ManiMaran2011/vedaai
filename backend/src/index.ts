import { config } from './config/index.js';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDB } from './lib/db.js';
import { redis } from './lib/queue.js';
import { initWebSocket } from './lib/websocket.js';
import { assignmentRoutes } from './routes/assignments.js';
import { profileRoutes } from './routes/profile.js';
import { apiLimiter } from './middleware/rateLimit.js';

const app = express();
const server = http.createServer(app);

// ─── Security & logging ───────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan(config.isDev ? 'dev' : 'combined'));

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: 'https://vedaai-website.vercel.app',
  credentials: true,
}));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/assignments', assignmentRoutes);
app.use('/api/profile', profileRoutes);

app.get('/health', (_req, res) => res.json({
  status: 'ok',
  env: config.nodeEnv,
  time: new Date().toISOString(),
}));

// ─── 404 & error handler ──────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: config.isDev ? err.message : 'Internal server error' });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function start() {
  console.log(`\n  ✦ VedaAI Backend [${config.nodeEnv}]`);

  await connectDB();
  await redis.connect().catch(() => console.warn('  ⚠ Redis unavailable — caching disabled'));

  initWebSocket(server);

  server.listen(config.port, () => {
    console.log(`  → http://localhost:${config.port}`);
    console.log(`  → ws://localhost:${config.port}/ws\n`);
  });
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  server.close(async () => {
    await redis.quit().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
