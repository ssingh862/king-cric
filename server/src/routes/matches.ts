import { isScoringMutation } from '../domain/access';
import { ownsTournament } from '../middleware/ownership';
import { validateRules, validateBall } from '../domain/scoring';
import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import {
  AuditLog,
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

  // All score and match mutations are organizer-owned, including direct API calls.
  router.use((req: AuthRequest, res, next) => {
    if (req.method === 'GET') return next();
    requireAuth(req, res, async () => {
      try {
        let match;
        if (req.path.startsWith('/innings/')) {
          const inn = await Innings.findById(req.path.split('/')[2]);
          match = inn ? await Match.findById(inn.match_id) : null;
        } else if (req.path.startsWith('/score-events/')) {
          const event = await ScoreEvent.findById(req.path.split('/')[2]);
          const inn = event ? await Innings.findById(event.innings_id) : null;
          match = inn ? await Match.findById(inn.match_id) : null;
        } else if (req.path !== '/') match = await Match.findById(req.path.split('/')[1]);
        const tournamentId = match?.tournament_id ?? (req.path === '/' ? req.body.tournament_id : null);
        if (!tournamentId) return res.status(404).json({ error: 'Match or innings not found' });
        const scoring = isScoringMutation(req.method, req.path, req.body);
        if (await ownsTournament(req, res, tournamentId, scoring)) {
          res.on('finish', () => {
            if(res.statusCode < 400) void AuditLog.create({tournament_id:tournamentId,actor_id:req.userId,action:`${req.method} ${req.path.includes('score-events') ? 'Delivery' : 'Match / innings'}`,resource:req.path}).catch(console.error);
          });
          next();
        }
      } catch { res.status(400).json({ error: 'Invalid match request' }); }
    });
  });

  async function enrichMatch(match: InstanceType<typeof Match>) {
    const m = match.toObject();
    const [teamA, teamB, tournament, innings] = await Promise.all([
      teamSummary(match.team_a_id), teamSummary(match.team_b_id),
      tournamentSummary(match.tournament_id),
      Innings.find({ match_id: match._id }).sort({ innings_number: 1 }),
    ]);
    return { ...mapMatchDoc(m, teamA, teamB, tournament), innings: innings.map(i => mapInningsDoc(i.toObject())) };
  }

  router.get('/upcoming', async (req, res) => {
    const { tournament_id } = req.query;
    const filter: Record<string, unknown> = { status: 'scheduled' };
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

  router.patch('/innings/:inningsId', async (req, res) => {
    const inn = await Innings.findById(req.params.inningsId);
    if (!inn) {
      res.status(404).json({ error: 'Innings not found' });
      return;
    }

    const allowed = [
      'status',
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

  router.post('/innings/:inningsId/score-events', async (req: AuthRequest, res) => {
    const inn = await Innings.findById(req.params.inningsId);
    if (!inn) {
      res.status(404).json({ error: 'Innings not found' });
      return;
    }

    const match = await Match.findById(inn.match_id);
    if (!match || match.status === 'completed' || inn.status === 'completed') {
      res.status(409).json({ error: 'This innings is complete. Undo a delivery before resuming.' }); return;
    }
    const rules = validateRules(match.rules);
    const previous = await ScoreEvent.find({ innings_id: inn._id }).sort({ created_at: 1, _id: 1 });
    let freeHit = false;
    for (const e of previous) {
      if (e.ball_type === 'no_ball' && rules.freeHitOnNoBall) freeHit = true;
      else if (e.ball_type !== 'wide' && e.ball_type !== 'no_ball') freeHit = false;
    }
    let ball;
    try { ball = validateBall(req.body, rules, freeHit); }
    catch (e) { res.status(400).json({ error: (e as Error).message }); return; }
    const ids = [req.body.striker_player_id, req.body.non_striker_player_id].filter(Boolean);
    const [batters, bowler] = await Promise.all([
      Player.countDocuments({ _id: { $in: ids }, team_id: inn.batting_team_id }),
      Player.findOne({ _id: req.body.bowler_player_id, team_id: inn.bowling_team_id }),
    ]);
    if (!req.body.striker_player_id || !bowler || batters !== ids.length || new Set(ids).size !== ids.length || (!rules.lastBatterStands && ids.length !== 2)) {
      res.status(400).json({ error: 'Choose distinct batters and a bowler from the correct teams' }); return;
    }
    if (ball.is_wicket && !ids.includes(req.body.dismissed_player_id)) {
      res.status(400).json({ error: 'The dismissed player must be at the crease' }); return;
    }
    const legalPrevious = previous.filter(e => e.is_legal_delivery);
    const lastLegal = legalPrevious.at(-1);
    if (lastLegal && lastLegal.ball_in_over >= 6 && String(req.body.bowler_player_id) === String(lastLegal.bowler_player_id)) {
      res.status(400).json({ error: 'That bowler just finished the over. Choose someone else for the next over.' });
      return;
    }
    const legalBalls = legalPrevious.length;
    const event = await ScoreEvent.create({
      ...ball, innings_id: inn._id, created_by: req.userId,
      over_number: Math.floor(legalBalls / 6) + 1, ball_number: legalBalls % 6 + 1, ball_in_over: legalBalls % 6 + 1,
      striker_player_id: req.body.striker_player_id, non_striker_player_id: req.body.non_striker_player_id || null,
      bowler_player_id: req.body.bowler_player_id, dismissed_player_id: ball.is_wicket ? req.body.dismissed_player_id : null,
      commentary: typeof req.body.commentary === 'string' ? req.body.commentary.slice(0, 200) : null,
    });

    const updatedInnings = await syncInningsFromEvents(String(inn._id));
    const mappedEvent = mapScoreEventDoc(event.toObject());
    const mappedInnings = updatedInnings ? mapInningsDoc(updatedInnings.toObject()) : null;

    io.to(`innings:${inn._id}`).emit('score_event', { type: 'INSERT', data: mappedEvent });
    if (mappedInnings) {
      io.to(`innings:${inn._id}`).emit('innings_updated', mappedInnings);
    }

    res.status(201).json({ ...mappedEvent, innings: mappedInnings });
  });

  router.delete('/score-events/:eventId', async (req, res) => {
    const event = await ScoreEvent.findById(req.params.eventId);
    if (!event) {
      res.status(404).json({ error: 'Score event not found' });
      return;
    }

    const last = await ScoreEvent.findOne({ innings_id: event.innings_id }).sort({ created_at: -1, _id: -1 });
    if (String(last?._id) !== String(event._id)) {
      res.status(409).json({ error: 'Undo from the latest delivery to preserve player and wicket history' }); return;
    }
    const parent = await Innings.findById(event.innings_id);
    if (parent && await Innings.exists({ match_id: parent.match_id, innings_number: { $gt: parent.innings_number } })) {
      res.status(409).json({ error: 'The chase has started; first-innings corrections are locked' }); return;
    }
    const inningsId = String(event.innings_id);
    const mapped = mapScoreEventDoc(event.toObject());
    await Innings.findByIdAndUpdate(inningsId, { striker_player_id: event.striker_player_id, non_striker_player_id: event.non_striker_player_id, current_bowler_id: event.bowler_player_id });
    await event.deleteOne();
    await syncInningsFromEvents(inningsId);

    io.to(`innings:${inningsId}`).emit('score_event', { type: 'DELETE', data: mapped });
    res.status(204).send();
  });

  router.patch('/score-events/:eventId', async (req, res) => {
    const event = await ScoreEvent.findById(req.params.eventId);
    if (!event) { res.status(404).json({ error: 'Delivery not found' }); return; }
    const last = await ScoreEvent.findOne({ innings_id: event.innings_id }).sort({ created_at: -1, _id: -1 });
    if (String(last?._id) !== String(event._id)) { res.status(409).json({ error: 'Undo later deliveries before editing this ball' }); return; }
    const inn = await Innings.findById(event.innings_id);
    const match = inn ? await Match.findById(inn.match_id) : null;
    if (!match) { res.status(404).json({ error: 'Match not found' }); return; }
    const laterInnings = await Innings.exists({ match_id: match._id, innings_number: { $gt: inn!.innings_number } });
    if (laterInnings) { res.status(409).json({ error: 'The chase has started; first-innings corrections are locked' }); return; }
    try {
      const ball = validateBall({ ...event.toObject(), runs_off_bat: req.body.runs_off_bat, extras: req.body.extras }, validateRules(match.rules), false);
      Object.assign(event, ball);
      event.commentary = 'Score corrected by organizer';
      await event.save();
      await syncInningsFromEvents(String(inn!._id));
      const updated = await Innings.findById(inn!._id);
      io.to(`innings:${inn!._id}`).emit('score_event', { type: 'UPDATE', data: mapScoreEventDoc(event.toObject()) });
      res.json({ event: mapScoreEventDoc(event.toObject()), innings: updated ? mapInningsDoc(updated.toObject()) : null });
    } catch (e) { res.status(400).json({ error: (e as Error).message }); }
  });

  router.get('/:id', async (req, res) => {
    const match = await Match.findById(req.params.id);
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }
    res.json(await enrichMatch(match));
  });

  router.post('/', async (req, res) => {
    const { tournament_id, team_a_id, team_b_id, venue, scheduled_at, overs_per_innings } = req.body;

    if (!tournament_id || !team_a_id || !team_b_id) {
      res.status(400).json({ error: 'tournament_id, team_a_id, and team_b_id are required' });
      return;
    }

    if (team_a_id === team_b_id || await Team.countDocuments({ _id: { $in: [team_a_id, team_b_id] }, tournament_id, is_approved:true }) !== 2) {
      res.status(400).json({ error: 'Choose two different teams in this tournament' }); return;
    }
    const overs = Number(overs_per_innings ?? 20);
    if (!Number.isInteger(overs) || overs < 1 || overs > 50) { res.status(400).json({ error: 'Choose 1–50 overs' }); return; }
    let rules;
    try { rules = validateRules(req.body.rules); } catch (e) { res.status(400).json({ error: (e as Error).message }); return; }
    const match = await Match.create({
      rules,
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

  router.patch('/:id', async (req, res) => {
    const match = await Match.findById(req.params.id);
    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    if ('rules' in req.body || 'overs_per_innings' in req.body) {
      if (await Innings.exists({ match_id: match._id })) { res.status(409).json({ error: 'Rules are locked after the toss and innings setup' }); return; }
      try { match.rules = validateRules(req.body.rules ?? match.rules); } catch (e) { res.status(400).json({ error: (e as Error).message }); return; }
      const overs = Number(req.body.overs_per_innings ?? match.overs_per_innings);
      if (!Number.isInteger(overs) || overs < 1 || overs > 50) { res.status(400).json({ error: 'Choose 1–50 overs' }); return; }
      match.overs_per_innings = overs;
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

  router.delete('/:id', async (req, res) => {
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
    await recalculateTournamentPoints(String(match.tournament_id));
    io.emit('match_updated', { id: String(match._id), deleted: true });
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

  router.post('/:id/innings', async (req: AuthRequest, res) => {
    const {
      batting_team_id,
      bowling_team_id,
      innings_number,
      striker_player_id,
      non_striker_player_id,
      current_bowler_id,
      target_runs,
    } = req.body;

    const match = await Match.findById(req.params.id);
    if (!match || ![1,2].includes(innings_number) || ![String(match.team_a_id),String(match.team_b_id)].includes(batting_team_id) || ![String(match.team_a_id),String(match.team_b_id)].includes(bowling_team_id) || batting_team_id === bowling_team_id) {
      res.status(400).json({ error: 'Invalid innings teams or number' }); return;
    }
    if (striker_player_id === non_striker_player_id || await Player.countDocuments({ _id: { $in: [striker_player_id,non_striker_player_id] }, team_id: batting_team_id }) !== 2 || !await Player.exists({ _id: current_bowler_id, team_id: bowling_team_id })) {
      res.status(400).json({ error: 'Choose two different batters and an opposing bowler' }); return;
    }
    if (await Innings.exists({ match_id: match._id, innings_number })) { res.status(409).json({ error: 'This innings has already started' }); return; }
    const first = innings_number === 2 ? await Innings.findOne({ match_id: match._id, innings_number: 1 }) : null;
    if (innings_number === 2 && first?.status !== 'completed') { res.status(409).json({ error: 'Complete the first innings before starting the chase' }); return; }
    const inn = await Innings.create({
      match_id: req.params.id,
      batting_team_id,
      bowling_team_id,
      innings_number,
      status: 'in_progress',
      striker_player_id,
      non_striker_player_id,
      current_bowler_id,
      target_runs: first ? first.total_runs + 1 : null,
    });

    await Match.findByIdAndUpdate(req.params.id, {
      status: 'live',
      current_innings_number: innings_number,
    });

    res.status(201).json(mapInningsDoc(inn.toObject()));
  });

  router.post('/:id/finalize', async (req, res) => {
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
