import { Innings, Match, Player, ScoreEvent } from '../models';

function maxWicketsForSquad(squadSize: number): number {
  if (squadSize <= 1) return 1;
  if (squadSize >= 11) return 10;
  return squadSize;
}

export async function syncInningsFromEvents(inningsId: string) {
  const inn = await Innings.findById(inningsId);
  if (!inn) return;

  const events = await ScoreEvent.find({ innings_id: inningsId });
  let totalRuns = 0;
  let totalWickets = 0;
  let legalBalls = 0;

  for (const e of events) {
    totalRuns += e.runs_off_bat + e.extras;
    if (e.is_wicket) totalWickets += 1;
    if (e.is_legal_delivery) legalBalls += 1;
  }

  const squadSize = await Player.countDocuments({ team_id: inn.batting_team_id });
  const maxWickets = maxWicketsForSquad(squadSize);

  const match = await Match.findById(inn.match_id);
  const oversPerInnings = match?.overs_per_innings ?? 20;
  const maxLegalBalls = oversPerInnings * 6;

  const totalOvers = Math.floor(legalBalls / 6) + (legalBalls % 6) * 0.1;
  let status: 'in_progress' | 'completed' = 'in_progress';

  if (totalWickets >= maxWickets) status = 'completed';
  if (legalBalls >= maxLegalBalls) status = 'completed';
  if (inn.innings_number === 2 && inn.target_runs && totalRuns >= inn.target_runs) {
    status = 'completed';
  }

  const last = events.sort((a, b) => a.created_at.getTime() - b.created_at.getTime()).at(-1);

  inn.total_runs = totalRuns;
  inn.total_wickets = totalWickets;
  inn.total_overs = totalOvers;
  inn.status = status;
  if (last) {
    inn.striker_player_id = last.striker_player_id;
    inn.non_striker_player_id = last.non_striker_player_id;
    inn.current_bowler_id = last.bowler_player_id;
  }

  await inn.save();
}
