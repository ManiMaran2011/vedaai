import '../config/index.js'; // loads dotenv
import mongoose from 'mongoose';
import { Worker } from 'bullmq';
import { config } from '../config/index.js';
import { generatePaper } from '../services/ai.service.js';
import { AssignmentModel } from '../models/index.js';
import { broadcast } from '../lib/websocket.js';
import { cache } from '../lib/queue.js';
import type { AssignmentInput } from '../types.js';

// Worker needs DB
mongoose.connect(config.mongoUri).then(() => {
  console.log('[Worker] MongoDB connected');
});

const worker = new Worker(
  'generation',
  async (job) => {
    const { assignmentId, input }: { assignmentId: string; input: AssignmentInput } = job.data;
    console.log(`[Worker] Processing job ${job.id} for ${assignmentId}`);

    await AssignmentModel.findByIdAndUpdate(assignmentId, { status: 'processing' });
    broadcast(assignmentId, { type: 'job:progress', assignmentId, progress: 5, message: 'Starting generation...' });

    const paper = await generatePaper(input, assignmentId, (progress, message) => {
      broadcast(assignmentId, { type: 'job:progress', assignmentId, progress, message });
    });

    await AssignmentModel.findByIdAndUpdate(assignmentId, {
      status: 'complete',
      paper,
      error: undefined,
    });

    // Cache result for 10 min
    await cache.set(`paper:${assignmentId}`, paper, 600);

    broadcast(assignmentId, { type: 'job:complete', assignmentId, paper });
    console.log(`[Worker] Job ${job.id} complete`);
    return { success: true };
  },
  {
    connection: { url: config.redisUrl },
    concurrency: 5,
  }
);

worker.on('failed', async (job, err) => {
  if (!job) return;
  const { assignmentId } = job.data;
  console.error(`[Worker] Job failed for ${assignmentId}:`, err.message);
  await AssignmentModel.findByIdAndUpdate(assignmentId, { status: 'failed', error: err.message });
  broadcast(assignmentId, { type: 'job:failed', assignmentId, error: err.message });
});

worker.on('ready', () => console.log('[Worker] Generation worker ready ✓'));
worker.on('error', (err) => console.error('[Worker] Error:', err.message));

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...');
  await worker.close();
  await mongoose.disconnect();
  process.exit(0);
});
