import type { Innings, Match, ScoreEvent } from '../types/database';
import { replayInnings, dedupeScoreEvents } from './cricket';
import { rulesForFormat } from './cricket/formats';
import { supabase } from './supabase';

type TeamAccum = {
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  runs_for: number;
  runs_against: number;
  overs_for: number;
  overs_against: number;
};

function ballsToOversDecimal(legalBalls: number, ballsPerOver = 6): number {
  if (legalBalls <= 0) return 0;
  return legalBalls / ballsPerOver;
}

function computeNrr(acc: TeamAccum): number {
  if (acc.overs_for <= 0 || acc.overs_against <= 0) return 0;
  return acc.runs_for / acc.overs_for - acc.runs_against / acc.overs_against;
}

export async function ensurePointsRowsForTournament(tournamentId: string) {
  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .eq('tournament_id', tournamentId);

  if (!teams?.length) return;

  for (const team of teams) {
    const { data: existing } = await supabase
      .from('points_table')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('team_id', team.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('points_table').insert({
        tournament_id: tournamentId,
        team_id: team.id,
      });
    }
  }
}

async function fetchMatchInningsStats(
  match: Match,
  inningsList: Innings[],
  events: ScoreEvent[]
) {
  const rules = rulesForFormat('custom', match.overs_per_innings);
  const allEvents = dedupeScoreEvents(events);

  const stats = new Map<
    string,
    { runsScored: number; runsConceded: number; oversFaced: number; oversBowled: number }
  >();

  const initTeam = (teamId: string) => {
    if (!stats.has(teamId)) {
      stats.set(teamId, { runsScored: 0, runsConceded: 0, oversFaced: 0, oversBowled: 0 });
    }
    return stats.get(teamId)!;
  };

  initTeam(match.team_a_id);
  initTeam(match.team_b_id);

  for (const inn of inningsList) {
    const innEvents = allEvents.filter((e) => e.innings_id === inn.id);
    const snap = replayInnings(inn, innEvents, rules);
    const batting = initTeam(inn.batting_team_id);
    const bowling = initTeam(inn.bowling_team_id);

    batting.runsScored += snap.totalRuns;
    batting.oversFaced += ballsToOversDecimal(snap.legalBalls, rules.ballsPerOver);
    bowling.runsConceded += snap.totalRuns;
    bowling.oversBowled += ballsToOversDecimal(snap.legalBalls, rules.ballsPerOver);
  }

  return stats;
}

function applyMatchToAccumulators(
  match: Match,
  teamStats: Map<string, { runsScored: number; runsConceded: number; oversFaced: number; oversBowled: number }>,
  accum: Map<string, TeamAccum>
) {
  const teamA = accum.get(match.team_a_id)!;
  const teamB = accum.get(match.team_b_id)!;
  const statsA = teamStats.get(match.team_a_id)!;
  const statsB = teamStats.get(match.team_b_id)!;

  teamA.played++;
  teamB.played++;

  teamA.runs_for += statsA.runsScored;
  teamA.runs_against += statsA.runsConceded;
  teamA.overs_for += statsA.oversFaced;
  teamA.overs_against += statsA.oversBowled;

  teamB.runs_for += statsB.runsScored;
  teamB.runs_against += statsB.runsConceded;
  teamB.overs_for += statsB.oversFaced;
  teamB.overs_against += statsB.oversBowled;

  const winnerId = match.winner_team_id;
  if (!winnerId) {
    teamA.tied++;
    teamB.tied++;
    teamA.points += 1;
    teamB.points += 1;
    return;
  }

  if (winnerId === match.team_a_id) {
    teamA.won++;
    teamA.points += 2;
    teamB.lost++;
  } else {
    teamB.won++;
    teamB.points += 2;
    teamA.lost++;
  }
}

/** Rebuild points table from all completed matches in a tournament. */
export async function recalculateTournamentPoints(
  tournamentId: string
): Promise<{ error: string | null }> {
  await ensurePointsRowsForTournament(tournamentId);

  const { data: teams } = await supabase
    .from('teams')
    .select('id')
    .eq('tournament_id', tournamentId);

  if (!teams?.length) return { error: null };

  const accum = new Map<string, TeamAccum>();
  for (const t of teams) {
    accum.set(t.id, {
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      runs_for: 0,
      runs_against: 0,
      overs_for: 0,
      overs_against: 0,
    });
  }

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('status', 'completed');

  for (const match of matches ?? []) {
    const { data: innings } = await supabase
      .from('innings')
      .select('*')
      .eq('match_id', match.id)
      .order('innings_number');

    if (!innings || innings.length < 2) continue;

    const ids = innings.map((i) => i.id);
    const { data: events } = await supabase
      .from('score_events')
      .select('*')
      .in('innings_id', ids);

    const teamStats = await fetchMatchInningsStats(match as Match, innings as Innings[], events ?? []);
    applyMatchToAccumulators(match as Match, teamStats, accum);
  }

  for (const [teamId, row] of accum) {
    const nrr = computeNrr(row);
    const { error } = await supabase
      .from('points_table')
      .update({
        played: row.played,
        won: row.won,
        lost: row.lost,
        tied: row.tied,
        points: row.points,
        runs_for: row.runs_for,
        runs_against: row.runs_against,
        overs_for: Number(row.overs_for.toFixed(1)),
        overs_against: Number(row.overs_against.toFixed(1)),
        net_run_rate: Number(nrr.toFixed(3)),
        updated_at: new Date().toISOString(),
      })
      .eq('tournament_id', tournamentId)
      .eq('team_id', teamId);

    if (error) return { error: error.message };
  }

  return { error: null };
}

export async function updatePointsAfterMatch(matchId: string) {
  const { data: match } = await supabase
    .from('matches')
    .select('tournament_id, status')
    .eq('id', matchId)
    .single();

  if (!match?.tournament_id || match.status !== 'completed') {
    return { error: 'Match not completed' };
  }

  return recalculateTournamentPoints(match.tournament_id);
}
