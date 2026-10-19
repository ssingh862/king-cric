import { Innings, Match, Player, ScoreEvent } from '../models';
import { validateRules, rotationRuns } from '../domain/scoring';
import { recalculateTournamentPoints } from './pointsTable';

export async function syncInningsFromEvents(inningsId: string) {
  const inn = await Innings.findById(inningsId);
  if (!inn) return;
  const [match, events, squad] = await Promise.all([
    Match.findById(inn.match_id),
    ScoreEvent.find({ innings_id: inningsId }).sort({ created_at: 1, _id: 1 }),
    Player.countDocuments({ team_id: inn.batting_team_id }),
  ]);
  const rules = validateRules(match?.rules);
  let runs = 0, wickets = 0, legalBalls = 0;
  let wides = 0, noBalls = 0, byes = 0, legByes = 0;
  for (const e of events) {
    runs += e.runs_off_bat + e.extras;
    if (e.is_wicket) wickets++;
    if (e.is_legal_delivery) legalBalls++;
    if (e.ball_type === 'wide') wides += e.extras;
    if (e.ball_type === 'no_ball') noBalls += e.extras;
    if (e.ball_type === 'bye') byes += e.extras + e.runs_off_bat;
    if (e.ball_type === 'leg_bye') legByes += e.extras + e.runs_off_bat;
  }
  const maxWickets = Math.max(1, squad - (rules.lastBatterStands ? 0 : 1));
  inn.total_runs = runs; inn.total_wickets = wickets;
  inn.total_overs = Math.floor(legalBalls / 6) + (legalBalls % 6) / 10;
  inn.extras_wide = wides; inn.extras_no_ball = noBalls; inn.extras_bye = byes; inn.extras_leg_bye = legByes;
  inn.status = wickets >= maxWickets || legalBalls >= (match?.overs_per_innings ?? 20) * 6 || (inn.target_runs != null && runs >= inn.target_runs) ? 'completed' : 'in_progress';
  const last = events.at(-1);
  if (last) {
    let striker = last.striker_player_id, nonStriker = last.non_striker_player_id;
    if (rotationRuns(last.ball_type, last.runs_off_bat, last.extras, rules) % 2 !== 0) [striker, nonStriker] = [nonStriker, striker];
    if (last.is_legal_delivery && legalBalls % 6 === 0) [striker, nonStriker] = [nonStriker, striker];
    if (last.is_wicket) {
      const out = String(last.dismissed_player_id ?? last.striker_player_id);
      if (String(striker) === out) striker = null;
      if (String(nonStriker) === out) nonStriker = null;
    }
    if (rules.lastBatterStands && !striker && nonStriker) [striker, nonStriker] = [nonStriker, null];
    inn.striker_player_id = striker; inn.non_striker_player_id = nonStriker;
    const overJustFinished = legalBalls > 0 && legalBalls % 6 === 0;
    if (!overJustFinished) inn.current_bowler_id = last.bowler_player_id;
  }
  await inn.save();
  const finishedBowler = [...events].reverse().find((e) => e.is_legal_delivery)?.bowler_player_id;
  if (legalBalls > 0 && legalBalls % 6 === 0 && finishedBowler) {
    await Innings.updateOne(
      { _id: inn._id, current_bowler_id: finishedBowler },
      { $set: { current_bowler_id: null } }
    );
    // Return the persisted bowler state without a second innings read.
    if (String(inn.current_bowler_id) === String(finishedBowler)) inn.current_bowler_id = null;
  }
  // A correction invalidates a previously published result until it is finalized again.
  if (match?.status === 'completed') {
    match.status = 'live'; match.winner_team_id = null; match.result_summary = null;
    match.man_of_the_match_player_id = null;
    await match.save();
    await recalculateTournamentPoints(String(match.tournament_id));
  }
  return inn;
}
