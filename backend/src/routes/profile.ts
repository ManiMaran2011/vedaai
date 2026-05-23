import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ProfileModel } from '../models/index.js';

const router = Router();

const ProfileSchema = z.object({
  name:           z.string().min(1),
  schoolName:     z.string().min(1),
  schoolLocation: z.string().default(''),
  subject:        z.string().default(''),
});

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

router.get('/', async (_req: Request, res: Response) => {
  let profile = await ProfileModel.findOne({ userId: 'default' }).lean();
  if (!profile) {
    profile = await ProfileModel.create({ userId: 'default' });
  }
  return res.json({ profile: { ...profile, id: (profile as Record<string, unknown>)._id?.toString() } });
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const validated = ProfileSchema.parse(req.body);
    const profile = await ProfileModel.findOneAndUpdate(
      { userId: 'default' },
      { ...validated, avatarInitials: getInitials(validated.name) },
      { upsert: true, new: true }
    ).lean();
    return res.json({ profile });
  } catch {
    return res.status(400).json({ error: 'Invalid profile data' });
  }
});

export { router as profileRoutes };
