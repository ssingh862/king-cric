import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Player, Team, PointsTable, toApi } from '../models';
import { tournamentSummary } from '../utils/serialize';

const router = Router();

router.get('/tournament/:tournamentId', async (req, res) => {
  const teams = await Team.find({ tournament_id: req.params.tournamentId }).sort({ name: 1 });
  res.json(
    teams.map((t) => ({
      id: String(t._id),
      name: t.name,
      short_name: t.short_name,
      primary_color: t.primary_color,
      is_approved: t.is_approved,
    }))
  );
});

router.get('/tournament/:tournamentId/points', async (req, res) => {
  const rows = await PointsTable.find({ tournament_id: req.params.tournamentId })
    .sort({ points: -1, net_run_rate: -1 });

  const out = await Promise.all(
    rows.map(async (row) => {
      const team = await Team.findById(row.team_id);
      return {
        ...toApi(row),
        tournament_id: String(row.tournament_id),
        team_id: String(row.team_id),
        team: team ? toApi(team) : null,
      };
    })
  );

  res.json(out);
});

router.post('/batch', requireAuth, async (req, res) => {
  const { team_id, players } = req.body as {
    team_id: string;
    players: Array<Record<string, unknown>>;
  };

  const rows = players
    .filter((p) => String(p.full_name ?? p.fullName ?? '').trim())
    .map((p) => ({
      team_id,
      full_name: String(p.full_name ?? p.fullName).trim(),
      jersey_number: p.jersey_number ?? (p.jerseyNumber ? parseInt(String(p.jerseyNumber), 10) : null),
      role: p.role ?? 'all_rounder',
      is_captain: p.is_captain ?? p.isCaptain ?? false,
      is_wicket_keeper: p.is_wicket_keeper ?? p.isWicketKeeper ?? false,
    }));

  if (rows.length) await Player.insertMany(rows);
  res.status(201).json({ ok: true });
});

router.patch('/:id', requireAuth, async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  const allowed = [
    'full_name',
    'jersey_number',
    'role',
    'is_captain',
    'is_wicket_keeper',
    'batting_style',
    'bowling_style',
    'profile_id',
  ] as const;

  for (const key of allowed) {
    if (key in req.body) (player as Record<string, unknown>)[key] = req.body[key];
  }

  await player.save();
  res.json(toApi(player));
});

router.post('/', requireAuth, async (req, res) => {
  const player = await Player.create(req.body);
  res.status(201).json(toApi(player));
});

router.delete('/:id', requireAuth, async (req, res) => {
  await Player.findByIdAndDelete(req.params.id);
  res.status(204).send();
});

export default router;
