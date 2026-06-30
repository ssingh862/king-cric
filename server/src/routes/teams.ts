import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import {
  Player,
  Team,
  Tournament,
  TournamentRegistration,
  PointsTable,
  toApi,
} from '../models';
import { tournamentSummary } from '../utils/serialize';

const router = Router();

router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  const profileId = req.userId!;
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];

  const captainTeams = await Team.find({ captain_id: profileId });
  for (const t of captainTeams) {
    const id = String(t._id);
    if (!seen.has(id)) {
      seen.add(id);
      const tournament = await tournamentSummary(t.tournament_id);
      out.push({ ...toApi(t), tournament });
    }
  }

  const regs = await TournamentRegistration.find({ registered_by: profileId });
  const regTeamIds = regs.map((r) => r.team_id).filter((id) => !seen.has(String(id)));

  if (regTeamIds.length) {
    const more = await Team.find({ _id: { $in: regTeamIds } });
    for (const t of more) {
      const id = String(t._id);
      if (!seen.has(id)) {
        seen.add(id);
        const tournament = await tournamentSummary(t.tournament_id);
        out.push({ ...toApi(t), tournament });
      }
    }
  }

  const linkedPlayers = await Player.find({ profile_id: profileId });
  const linkedIds = linkedPlayers
    .map((p) => p.team_id)
    .filter((id) => !seen.has(String(id)));

  if (linkedIds.length) {
    const linkedTeams = await Team.find({ _id: { $in: linkedIds } });
    for (const t of linkedTeams) {
      const id = String(t._id);
      if (!seen.has(id)) {
        seen.add(id);
        const tournament = await tournamentSummary(t.tournament_id);
        out.push({ ...toApi(t), tournament });
      }
    }
  }

  out.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  res.json(out);
});

router.get('/:id', async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }

  const players = await Player.find({ team_id: team._id }).sort({ jersey_number: 1 });
  const tournament = await Tournament.findById(team.tournament_id);

  res.json({
    ...toApi(team),
    players: players.map((p) => toApi(p)),
    tournament: tournament ? toApi(tournament) : null,
  });
});

router.post('/register', requireAuth, async (req: AuthRequest, res) => {
  const { tournament_id, team_name, short_name, captain_id, players = [] } = req.body;
  const captainId = captain_id ?? req.userId;

  if (!tournament_id || !team_name?.trim()) {
    res.status(400).json({ error: 'Tournament and team name are required' });
    return;
  }

  const name = team_name.trim();
  const short = (short_name?.trim() || name.slice(0, 3)).toUpperCase().slice(0, 4);

  try {
    const team = await Team.create({
      tournament_id,
      captain_id: captainId,
      name,
      short_name: short,
      is_approved: true,
    });

    await TournamentRegistration.create({
      tournament_id,
      team_id: team._id,
      registered_by: captainId,
      status: 'approved',
    });

    const playerRows = (players as Array<Record<string, unknown>>)
      .filter((p) => String(p.full_name ?? p.fullName ?? '').trim())
      .map((p) => ({
        team_id: team._id,
        full_name: String(p.full_name ?? p.fullName).trim(),
        jersey_number: p.jersey_number ?? (p.jerseyNumber ? parseInt(String(p.jerseyNumber), 10) : null),
        role: p.role ?? 'all_rounder',
        is_captain: p.is_captain ?? p.isCaptain ?? false,
        is_wicket_keeper: p.is_wicket_keeper ?? p.isWicketKeeper ?? false,
      }));

    if (playerRows.length) {
      await Player.insertMany(playerRows);
    }

    await Player.updateMany(
      { team_id: team._id, is_captain: true },
      { profile_id: captainId }
    );

    await PointsTable.findOneAndUpdate(
      { tournament_id, team_id: team._id },
      { tournament_id, team_id: team._id },
      { upsert: true }
    );

    res.status(201).json({ id: String(team._id) });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes('duplicate')) {
      res.status(409).json({ error: 'A team with this name already exists in this tournament' });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }

  const { name, short_name, primary_color } = req.body;
  if (name) team.name = name.trim();
  if (short_name) team.short_name = short_name.trim().toUpperCase().slice(0, 4);
  if (primary_color) team.primary_color = primary_color;

  await team.save();
  res.json(toApi(team));
});

export default router;
