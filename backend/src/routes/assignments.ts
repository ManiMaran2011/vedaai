import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import mongoose from 'mongoose';
import { AssignmentModel } from '../models/index.js';
import { cache } from '../lib/queue.js';
import { generatePaper } from '../services/ai.service.js';
import { broadcast } from '../lib/websocket.js';
import { createLimiter } from '../middleware/rateLimit.js';
import type { AssignmentInput } from '../types.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const ConfigSchema = z.object({
  type: z.enum(['mcq','short_answer','long_answer','true_false','fill_blank','diagram','numerical']),
  label: z.string(),
  count: z.number().int().min(0).max(50),
  marksEach: z.number().min(0.5).max(100),
});

const CreateSchema = z.object({
  title:       z.string().min(1),
  subject:     z.string().min(1),
  grade:       z.string().min(1),
  schoolName:  z.string().min(1),
  teacherName: z.string().min(1),
  dueDate:     z.string().min(1),
  duration:    z.number().min(5).max(480),
  totalMarks:  z.number().min(1),
  gradingScale:   z.string().default('Marks'),
  instructions:   z.string().default(''),
  questionConfigs: z.array(ConfigSchema).min(1),
  difficultyDistribution: z.object({
    easy: z.number().min(0).max(100),
    medium: z.number().min(0).max(100),
    hard: z.number().min(0).max(100),
  }),
});

async function runGeneration(assignmentId: string, input: AssignmentInput) {
  try {
    await AssignmentModel.findByIdAndUpdate(assignmentId, { status: 'processing' });
    broadcast(assignmentId, { type: 'job:progress', assignmentId, progress: 5, message: 'Starting generation...' });

    const paper = await generatePaper(input, assignmentId, (progress, message) => {
      broadcast(assignmentId, { type: 'job:progress', assignmentId, progress, message });
    });

    await AssignmentModel.findByIdAndUpdate(assignmentId, { status: 'complete', paper, error: undefined });
    await cache.set(`assignment:${assignmentId}`, paper, 600);
    broadcast(assignmentId, { type: 'job:complete', assignmentId, paper });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Generation failed';
    await AssignmentModel.findByIdAndUpdate(assignmentId, { status: 'failed', error: msg });
    broadcast(assignmentId, { type: 'job:failed', assignmentId, error: msg });
    console.error('[Generation Error]', msg);
  }
}

// POST /assignments
router.post('/', createLimiter, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const body = req.file ? JSON.parse(req.body.data || '{}') : req.body;
    const validated = CreateSchema.parse(body);

    let fileContent: string | undefined;
    if (req.file) {
      if (req.file.mimetype === 'text/plain') {
        fileContent = req.file.buffer.toString('utf-8');
      } else if (req.file.mimetype === 'application/pdf') {
        const pdfParse = (await import('pdf-parse')).default;
        fileContent = (await pdfParse(req.file.buffer)).text;
      }
    }

    const input = { ...validated, fileContent } as AssignmentInput;

    const assignment = await AssignmentModel.create({
      ...validated,
      dueDate: new Date(validated.dueDate),
      assignedOn: new Date(),
      status: 'pending',
      input,
    });

    res.status(201).json({ assignment: formatAssignment(assignment.toObject()) });

    setImmediate(() => runGeneration(assignment._id.toString(), input));
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', details: err.errors });
    console.error('[POST /assignments]', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /assignments
router.get('/', async (_req: Request, res: Response) => {
  const assignments = await AssignmentModel.find({}, { paper: 0, 'input.fileContent': 0 })
    .sort({ createdAt: -1 }).limit(100).lean();
  return res.json({ assignments: assignments.map(formatAssignment) });
});

// GET /assignments/:id
router.get('/:id', async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ error: 'Invalid ID' });

  const cached = await cache.get(`assignment:${req.params.id}`);
  if (cached) return res.json({ assignment: cached, source: 'cache' });

  const assignment = await AssignmentModel.findById(req.params.id).lean();
  if (!assignment) return res.status(404).json({ error: 'Not found' });

  const formatted = formatAssignment(assignment);
  if (assignment.status === 'complete') {
    await cache.set(`assignment:${req.params.id}`, formatted, 600);
  }

  return res.json({ assignment: formatted });
});

// DELETE /assignments/:id
router.delete('/:id', async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ error: 'Invalid ID' });
  await AssignmentModel.findByIdAndDelete(req.params.id);
  await cache.del(`assignment:${req.params.id}`);
  return res.json({ message: 'Deleted' });
});

// POST /assignments/:id/regenerate
router.post('/:id/regenerate', async (req: Request, res: Response) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ error: 'Invalid ID' });

  const assignment = await AssignmentModel.findById(req.params.id);
  if (!assignment) return res.status(404).json({ error: 'Not found' });

  await cache.del(`assignment:${req.params.id}`);
  await AssignmentModel.findByIdAndUpdate(req.params.id, {
    status: 'pending', paper: null, error: undefined,
  });

  res.json({ message: 'Regeneration queued' });

  setImmediate(() => runGeneration(req.params.id, assignment.input as AssignmentInput));
});

// Helper
function formatAssignment(doc: Record<string, unknown>): Record<string, unknown> {
  const id = (doc._id as { toString(): string })?.toString() || doc.id;
  return {
    ...doc,
    id,
    _id: undefined,
    __v: undefined,
  };
}

export { router as assignmentRoutes };
 
