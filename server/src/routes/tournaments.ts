import { ClubEntry } from '../models/clubs';
import { ownsTournament } from '../middleware/ownership';
import { Router } from 'express';
import { requireAuth, optionalAuth, type AuthRequest } from '../middleware/auth';
import { Tournament, Match, Innings, ScoreEvent, Team, Player, PointsTable, TournamentRegistration, toApi } from '../models';
import { tournamentLeaders } from '../services/career';

const router = Router();
const BALL_TYPES = ['tennis', 'leather', 'tape', 'rubber'];

function cleanPhone(value: unknown): string | null {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

router.get('/', optionalAuth, async (req, res) => {
  const { status } = req.query;
  const filter: Record<string, unknown> = { 'settings.archived': { $ne: true } };
  if (status) filter.status = status;

  const list = await Tournament.find(filter).sort({ created_at: -1 });
  res.json(list.map((t) => toApi(t)));
});

router.get('/:id/leaders', async (req, res) => {
  res.json(await tournamentLeaders(req.params.id));
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
    logo_url,
    organizer_name,
    organizer_phone,
    start_date,
    registration_date,
    registration_deadline,
    ball_type,
  } = req.body;

  if (!name?.trim()) {
    res.status(400).json({ error: 'Tournament name is required' });
    return;
  }
  if (!String(organizer_name ?? '').trim()) {
    res.status(400).json({ error: 'Organizer name is required' });
    return;
  }
  const phone = cleanPhone(organizer_phone);
  if (!phone) {
    res.status(400).json({ error: 'Enter a valid organizer phone number' });
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(start_date ?? ''))) {
    res.status(400).json({ error: 'Select the tournament date' });
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(registration_date ?? ''))) {
    res.status(400).json({ error: 'Select the registration date' });
    return;
  }
  const closingDay = String(registration_deadline ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(closingDay) || Number.isNaN(Date.parse(String(registration_deadline)))) {
    res.status(400).json({ error: 'Select the closing date' });
    return;
  }
  if (closingDay < String(registration_date)) {
    res.status(400).json({ error: 'Closing date must be on or after the registration date' });
    return;
  }
  if (ball_type && !BALL_TYPES.includes(ball_type)) {
    res.status(400).json({ error: 'Select a ball type' });
    return;
  }
  let logo: string | null = null;
  if (logo_url) {
    if (typeof logo_url !== 'string' || !logo_url.startsWith('data:image/') || logo_url.length > 900_000) {
      res.status(400).json({ error: 'Tournament logo is too large or not an image' });
      return;
    }
    logo = logo_url;
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
      logo_url: logo,
      organizer_name: String(organizer_name).trim(),
      organizer_phone: phone,
      start_date,
      registration_date,
      registration_deadline: new Date(registration_deadline),
      ball_type: ball_type ?? 'tennis',
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

  if (!await ownsTournament(req, res, t._id)) return;
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
    'registration_date',
    'registration_deadline',
    'logo_url',
    'organizer_name',
    'organizer_phone',
    'ball_type',
  ] as const;

  if ('organizer_phone' in req.body) {
    const phone = cleanPhone(req.body.organizer_phone);
    if (!phone) {
      res.status(400).json({ error: 'Enter a valid organizer phone number' });
      return;
    }
    req.body.organizer_phone = phone;
  }
  if ('ball_type' in req.body && !BALL_TYPES.includes(req.body.ball_type)) {
    res.status(400).json({ error: 'Select a ball type' });
    return;
  }
  if ('start_date' in req.body && req.body.start_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(req.body.start_date))) {
    res.status(400).json({ error: 'Select the tournament date' });
    return;
  }
  if ('registration_date' in req.body && req.body.registration_date && !/^\d{4}-\d{2}-\d{2}$/.test(String(req.body.registration_date))) {
    res.status(400).json({ error: 'Select the registration date' });
    return;
  }
  if ('registration_deadline' in req.body && req.body.registration_deadline) {
    const closingDay = String(req.body.registration_deadline).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(closingDay) || Number.isNaN(Date.parse(String(req.body.registration_deadline)))) {
      res.status(400).json({ error: 'Select the closing date' });
      return;
    }
    req.body.registration_deadline = new Date(req.body.registration_deadline);
  }
  if ('logo_url' in req.body && req.body.logo_url) {
    const logo = req.body.logo_url;
    if (typeof logo !== 'string' || !logo.startsWith('data:image/') || logo.length > 900_000) {
      res.status(400).json({ error: 'Tournament logo is too large or not an image' });
      return;
    }
  }

  for (const key of allowed) {
    if (key in req.body) (t as Record<string, unknown>)[key] = req.body[key];
  }

  await t.save();
  res.json(toApi(t));
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  if (!await ownsTournament(req, res, req.params.id)) return;
  const matches = await Match.find({ tournament_id: req.params.id });
  const innings = await Innings.find({ match_id: { $in: matches.map(m => m._id) } });
  const teams = await Team.find({ tournament_id: req.params.id });
  await ScoreEvent.deleteMany({ innings_id: { $in: innings.map(i => i._id) } });
  await Innings.deleteMany({ match_id: { $in: matches.map(m => m._id) } });
  await Match.deleteMany({ tournament_id: req.params.id });
  await Player.deleteMany({ team_id: { $in: teams.map(t => t._id) } });
  await Team.deleteMany({ tournament_id: req.params.id });
  await PointsTable.deleteMany({ tournament_id: req.params.id });
  await TournamentRegistration.deleteMany({ tournament_id: req.params.id });
  await ClubEntry.deleteMany({tournament_id:req.params.id});
  await Tournament.findByIdAndDelete(req.params.id);
  res.status(204).send();
});
export default router;
