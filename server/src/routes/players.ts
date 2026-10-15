import { ownsTeam } from '../middleware/ownership';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { Player, Team, PointsTable, ScoreEvent, toApi } from '../models';
import { playerCareer } from '../services/career';
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

  if (!await ownsTeam(req, res, team_id)) return;
  if (!Array.isArray(players)) { res.status(400).json({ error: 'Players must be a list' }); return; }
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

router.get('/:id/career', async (req, res) => {
  const career = await playerCareer(req.params.id);
  if (!career) { res.status(404).json({ error: 'Player not found' }); return; }
  res.json(career);
});

router.patch('/:id', requireAuth, async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  if (!await ownsTeam(req, res, player.team_id)) return;
  if ('profile_id' in req.body) { res.status(400).json({error:'Link accounts through a player invitation'}); return; }
  const allowed = [
    'full_name',
    'jersey_number',
    'role',
    'is_captain',
    'is_wicket_keeper',
    'batting_style',
    'bowling_style',
    'photo_url',
  ] as const;

  for (const key of allowed) {
    if (key in req.body) {
      if (key === 'photo_url' && req.body.photo_url && String(req.body.photo_url).length > 900000) { res.status(400).json({ error: 'Photo is too large' }); return; }
      (player as Record<string, unknown>)[key] = req.body[key];
    }
  }

  await player.save();
  res.json(toApi(player));
});

router.post('/', requireAuth, async (req, res) => {
  if (!await ownsTeam(req, res, req.body.team_id)) return;
  const { team_id, full_name, jersey_number, role, is_captain, is_wicket_keeper } = req.body;
  const player = await Player.create({ team_id, full_name, jersey_number, role, is_captain, is_wicket_keeper });
  res.status(201).json(toApi(player));
});

router.delete('/:id', requireAuth, async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) { res.status(404).json({ error: 'Player not found' }); return; }
  if (!await ownsTeam(req, res, player.team_id)) return;
  if (await ScoreEvent.exists({ $or: ['striker_player_id','non_striker_player_id','bowler_player_id','dismissed_player_id'].map(key => ({ [key]: player._id })) })) {
    res.status(409).json({ error: 'This player appears in a scorecard. Edit their details instead.' }); return;
  }
  await player.deleteOne();
  res.status(204).send();
});

export default router;
