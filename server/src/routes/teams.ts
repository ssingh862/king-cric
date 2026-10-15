import { ClubEntry } from '../models/clubs';
import { ownsTeam, ownsTournament } from '../middleware/ownership';
import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import {
  Innings,
  Match,
  Player,
  ScoreEvent,
  Team,
  Tournament,
  TournamentRegistration,
  PointsTable,
  toApi,
} from '../models';
import { recalculateTournamentPoints } from '../services/pointsTable';
import { tournamentSummary } from '../utils/serialize';
import { squadLockInfo } from '../services/squadSync';

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
  const lock = await squadLockInfo(team._id);

  res.json({
    ...toApi(team),
    players: players.map((p) => toApi(p)),
    tournament: tournament ? toApi(tournament) : null,
    squad_locked: lock.locked,
    squad_lock_reason: lock.reason,
  });
});

router.post('/register', requireAuth, async (req: AuthRequest, res) => {
  const { tournament_id, team_name, short_name, captain_id, players = [] } = req.body;
  const captainId = req.userId;

  if (!tournament_id || !team_name?.trim()) {
    res.status(400).json({ error: 'Tournament and team name are required' });
    return;
  }

  const tournament = await Tournament.findById(tournament_id);
  if (!tournament || tournament.settings?.archived) { res.status(400).json({error:'Registration is closed'}); return; }
  const organizer = String(tournament.organizer_id) === req.userId;
  if (!organizer && !['registration','draft'].includes(tournament.status)) { res.status(400).json({error:'Registration is closed'}); return; }
  if (!organizer && tournament.registration_deadline && tournament.registration_deadline < new Date()) { res.status(400).json({error:'Registration deadline has passed'}); return; }
  if (await Team.countDocuments({tournament_id}) >= tournament.max_teams) { res.status(400).json({error:'Tournament team limit reached'}); return; }
  const name = team_name.trim();
  const short = (short_name?.trim() || name.slice(0, 3)).toUpperCase().slice(0, 4);

  try {
    const team = await Team.create({
      tournament_id,
      captain_id: captainId,
      name,
      short_name: short,
      is_approved: organizer,
    });

    await TournamentRegistration.create({
      tournament_id,
      team_id: team._id,
      registered_by: captainId,
      status: organizer ? 'approved' : 'pending',
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

  if (!await ownsTeam(req, res, team._id)) return;
  const { name, short_name, primary_color } = req.body;
  if (name) team.name = name.trim();
  if (short_name) team.short_name = short_name.trim().toUpperCase().slice(0, 4);
  if (primary_color) team.primary_color = primary_color;

  await team.save();
  res.json(toApi(team));
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const team = await Team.findById(req.params.id);
  if (!team) { res.status(404).json({ error: 'Team not found' }); return; }
  if (!await ownsTournament(req, res, team.tournament_id)) return;
  const matches = await Match.find({ $or: [{ team_a_id: team._id }, { team_b_id: team._id }] });
  if (matches.some((match) => match.status !== 'scheduled')) {
    res.status(409).json({ error: 'This team has a live or finished match. You can remove it only before a match goes live.' });
    return;
  }
  for (const match of matches) {
    const innings = await Innings.find({ match_id: match._id });
    await ScoreEvent.deleteMany({ innings_id: { $in: innings.map((row) => row._id) } });
    await Innings.deleteMany({ match_id: match._id });
    await match.deleteOne();
  }
  await Player.deleteMany({ team_id: team._id });
  await TournamentRegistration.deleteMany({ team_id: team._id });
  await PointsTable.deleteMany({ team_id: team._id });
  await ClubEntry.updateMany({ team_id: team._id }, { $set: { status: 'declined' }, $unset: { team_id: 1, member_ids: 1 } });
  await team.deleteOne();
  await recalculateTournamentPoints(String(team.tournament_id));
  res.status(204).send();
});
export default router;
