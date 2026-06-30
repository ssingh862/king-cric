import { Router } from 'express';
import { requireAuth, optionalAuth, type AuthRequest } from '../middleware/auth';
import { Tournament, toApi } from '../models';

const router = Router();

router.get('/', optionalAuth, async (req, res) => {
  const { status } = req.query;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const list = await Tournament.find(filter).sort({ created_at: -1 });
  res.json(list.map((t) => toApi(t)));
});

router.get('/:id', async (req, res) => {
  const t = await Tournament.findById(req.params.id);
  if (!t) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }
  res.json(toApi(t));
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const {
    name,
    slug,
    city,
    venue,
    format,
    overs_per_innings,
    status,
    description,
    max_teams,
  } = req.body;

  if (!name?.trim()) {
    res.status(400).json({ error: 'Tournament name is required' });
    return;
  }

  try {
    const t = await Tournament.create({
      organizer_id: req.userId,
      name: name.trim(),
      slug: slug ?? `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`,
      city: city ?? null,
      venue: venue ?? null,
      format: format ?? 'T20',
      overs_per_innings: overs_per_innings ?? 20,
      status: status ?? 'registration',
      description: description ?? null,
      max_teams: max_teams ?? 8,
    });
    res.status(201).json(toApi(t));
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes('duplicate')) {
      res.status(409).json({ error: 'A tournament with this slug already exists' });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const t = await Tournament.findById(req.params.id);
  if (!t) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  const allowed = [
    'name',
    'city',
    'venue',
    'format',
    'overs_per_innings',
    'max_teams',
    'status',
    'description',
    'start_date',
    'end_date',
  ] as const;

  for (const key of allowed) {
    if (key in req.body) (t as Record<string, unknown>)[key] = req.body[key];
  }

  await t.save();
  res.json(toApi(t));
});

export default router;
