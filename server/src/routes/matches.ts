import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import {
  Innings,
  Match,
  Player,
  ScoreEvent,
  Team,
  toApi,
} from '../models';
import { mapInningsDoc, mapMatchDoc, mapScoreEventDoc, teamSummary, tournamentSummary } from '../utils/serialize';
import { syncInningsFromEvents } from '../services/inningsSync';
import { recalculateTournamentPoints } from '../services/pointsTable';
import type { Server } from 'socket.io';

export function createMatchesRouter(io: Server) {
  const router = Router();

  async function enrichMatch(match: InstanceType<typeof Match>) {
    const m = match.toObject();
    const teamA = await teamSummary(match.team_a_id);
    const teamB = await teamSummary(match.team_b_id);
    const tournament = await tournamentSummary(match.tournament_id);
    return mapMatchDoc(m, teamA, teamB, tournament);
  }

  router.get('/upcoming', async (req, res) => {
    const { tournament_id } = req.query;
    const filter: Record<string, unknown> = { status: { $in: ['scheduled', 'live'] } };
    if (tournament_id) filter.tournament_id = tournament_id;

    const matches = await Match.find(filter).sort({ scheduled_at: -1 });
    const out = await Promise.all(matches.map((m) => enrichMatch(m)));
    res.json(out);
  });

  router.get('/live', async (_req, res) => {
    const matches = await Match.find({ status: 'live' }).sort({ scheduled_at: -1 });
    const out = await Promise.all(matches.map((m) => enrichMatch(m)));
    res.json(out);
  });

  router.get('/completed', async (req, res) => {
    const { tournament_id } = req.query;
    const filter: Record<string, unknown> = { status: 'completed' };
    if (tournament_id) filter.tournament_id = tournament_id;

    const matches = await Match.find(filter).sort({ scheduled_at: -1 });
    const out = await Promise.all(matches.map((m) => enrichMatch(m)));
    res.json(out);
  });

  router.get('/tournament/:tournamentId', async (req, res) => {
    const matches = await Match.find({ tournament_id: req.params.tournamentId }).sort({
      scheduled_at: -1,
    });
    const out = await Promise.all(matches.map((m) => enrichMatch(m)));
    res.json(out);
  });

  router.get('/teams/:teamId/players', async (req, res) => {
    const players = await Player.find({ team_id: req.params.teamId }).sort({ jersey_number: 1 });
    res.json(players.map((p) => toApi(p)));
  });

  router.patch('/innings/:inningsId', requireAuth, async (req, res) => {
    const inn = await Innings.findById(req.params.inningsId);
    if (!inn) {
      res.status(404).json({ error: 'Innings not found' });
      return;
    }

    const allowed = [
      'status',
      'total_runs',
      'total_wickets',
      'total_overs',
      'striker_player_id',
      'non_striker_player_id',
      'current_bowler_id',
      'target_runs',
    ] as const;

    for (const key of allowed) {
      if (key in req.body) (inn as Record<string, unknown>)[key] = req.body[key];
    }

    await inn.save();
    const mapped = mapInningsDoc(inn.toObject());
    io.to(`innings:${inn._id}`).emit('innings_updated', mapped);
    res.json(mapped);
  });

  router.get('/innings/:inningsId/score-events', async (req, res) => {
    const events = await ScoreEvent.find({ innings_id: req.params.inningsId }).sort({
      created_at: 1,
    });
    res.json(events.map((e) => mapScoreEventDoc(e.toObject())));
  });

  router.post('/innings/:inningsId/score-events', requireAuth, async (req: AuthRequest, res) => {
    const inn = await Innings.findById(req.params.inningsId);
    if (!inn) {
      res.status(404).json({ error: 'Innings not found' });
      return;
    }

    const event = await ScoreEvent.create({
      innings_id: inn._id,
      created_by: req.userId,
      ...req.body,
    });

    await syncInningsFromEvents(String(inn._id));
    const updatedInnings = await Innings.findById(inn._id);
    const mappedEvent = mapScoreEventDoc(event.toObject());
    const mappedInnings = updatedInnings ? mapInningsDoc(updatedInnings.toObject()) : null;

    io.to(`innings:${inn._id}`).emit('score_event', { type: 'INSERT', data: mappedEvent });
    if (mappedInnings) {
      io.to(`innings:${inn._id}`).emit('innings_updated', mappedInnings);
    }

    res.status(201).json(mappedEvent);
  });

  router.delete('/score-events/:eventId', requireAuth, async (req, res) => {
    const event = await ScoreEvent.findById(req.params.eventId);
    if (!event) {
      res.status(404).json({ error: 'Score event not found' });
      return;
    }

    const inningsId = String(event.innings_id);
    const mapped = mapScoreEventDoc(event.toObject());
    await event.deleteOne();
    await syncInningsFromEvents(inningsId);

    io.to(`innings:${inningsId}`).emit('score_event', { type: 'DELETE', data: mapped });
    res.status(204).send();
  });

  router.get('/:id', async (req, res) => {
    const match = await Match.findById(req.params.id);
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }
    res.json(await enrichMatch(match));
  });

  router.post('/', requireAuth, async (req, res) => {
    const { tournament_id, team_a_id, team_b_id, venue, scheduled_at, overs_per_innings } = req.body;

    if (!tournament_id || !team_a_id || !team_b_id) {
      res.status(400).json({ error: 'tournament_id, team_a_id, and team_b_id are required' });
      return;
    }

    const match = await Match.create({
      tournament_id,
      team_a_id,
      team_b_id,
      venue: venue ?? null,
      scheduled_at: scheduled_at ?? new Date(),
      status: 'scheduled',
      overs_per_innings: overs_per_innings ?? 20,
    });

    res.status(201).json({ id: String(match._id) });
  });

  router.patch('/:id', requireAuth, async (req, res) => {
    const match = await Match.findById(req.params.id);
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const allowed = [
      'status',
      'winner_team_id',
      'result_summary',
      'man_of_the_match_player_id',
      'toss_winner_team_id',
      'toss_decision',
      'current_innings_number',
      'venue',
      'scheduled_at',
    ] as const;

    for (const key of allowed) {
      if (key in req.body) (match as Record<string, unknown>)[key] = req.body[key];
    }

    await match.save();
    io.emit('match_updated', await enrichMatch(match));
    res.json(await enrichMatch(match));
  });

  router.delete('/:id', requireAuth, async (req, res) => {
    const match = await Match.findById(req.params.id);
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const innings = await Innings.find({ match_id: match._id });
    const inningsIds = innings.map((i) => i._id);
    await ScoreEvent.deleteMany({ innings_id: { $in: inningsIds } });
    await Innings.deleteMany({ match_id: match._id });
    await match.deleteOne();
    res.status(204).send();
  });

  router.get('/:id/innings', async (req, res) => {
    const innings = await Innings.find({ match_id: req.params.id }).sort({ innings_number: 1 });
    const out = await Promise.all(
      innings.map(async (inn) => {
        const battingTeam = await teamSummary(inn.batting_team_id);
        const bowlingTeam = await teamSummary(inn.bowling_team_id);
        return mapInningsDoc(inn.toObject(), battingTeam, bowlingTeam);
      })
    );
    res.json(out);
  });

  router.get('/:id/score-events', async (req, res) => {
    const innings = await Innings.find({ match_id: req.params.id }).sort({ innings_number: 1 });
    if (!innings.length) {
      res.json({ innings: [], eventsByInnings: {} });
      return;
    }

    const ids = innings.map((i) => i._id);
    const events = await ScoreEvent.find({ innings_id: { $in: ids } }).sort({ created_at: 1 });

    const eventsByInnings: Record<string, unknown[]> = {};
    for (const id of ids) eventsByInnings[String(id)] = [];

    for (const ev of events) {
      const key = String(ev.innings_id);
      eventsByInnings[key].push(mapScoreEventDoc(ev.toObject()));
    }

    res.json({
      innings: innings.map((i) => ({
        id: String(i._id),
        innings_number: i.innings_number,
        batting_team_id: String(i.batting_team_id),
        bowling_team_id: String(i.bowling_team_id),
      })),
      eventsByInnings,
    });
  });

  router.get('/:id/active-innings', async (req, res) => {
    const inn = await Innings.findOne({ match_id: req.params.id, status: 'in_progress' });
    if (!inn) {
      res.json(null);
      return;
    }
    res.json(mapInningsDoc(inn.toObject()));
  });

  router.post('/:id/innings', requireAuth, async (req: AuthRequest, res) => {
    const {
      batting_team_id,
      bowling_team_id,
      innings_number,
      striker_player_id,
      non_striker_player_id,
      current_bowler_id,
      target_runs,
    } = req.body;

    const inn = await Innings.create({
      match_id: req.params.id,
      batting_team_id,
      bowling_team_id,
      innings_number,
      status: 'in_progress',
      striker_player_id,
      non_striker_player_id,
      current_bowler_id,
      target_runs: target_runs ?? null,
    });

    await Match.findByIdAndUpdate(req.params.id, {
      status: 'live',
      current_innings_number: innings_number,
    });

    res.status(201).json(mapInningsDoc(inn.toObject()));
  });

  router.post('/:id/finalize', requireAuth, async (req, res) => {
    const match = await Match.findById(req.params.id);
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    const { winner_team_id, result_summary, man_of_the_match_player_id } = req.body;
    match.status = 'completed';
    match.winner_team_id = winner_team_id ?? null;
    match.result_summary = result_summary;
    if (man_of_the_match_player_id) {
      match.man_of_the_match_player_id = man_of_the_match_player_id;
    }
    await match.save();

    const pointsErr = await recalculateTournamentPoints(String(match.tournament_id));
    if (pointsErr) {
      res.status(500).json({ error: pointsErr });
      return;
    }

    res.json(await enrichMatch(match));
  });

  return router;
}
