import type { Innings, Match, ScoreEvent } from '../types/database';
import { calculateMatchResult, formatScoreLine } from './cricket/result';
import { replayInnings, dedupeScoreEvents } from './cricket';
import { rulesForFormat } from './cricket/formats';
import type { MatchRules } from './cricket/types';
import { completeInnings, fetchMatchInnings } from './matches';
import { updatePointsAfterMatch } from './pointsTable';
import { supabase } from './supabase';

export interface MatchOutcome {
  winnerTeamId: string | null;
  winnerName: string;
  summary: string;
  motm: { playerId: string; playerName: string; reason?: string } | null;
  innings1Line: string;
  innings2Line: string;
  kind: 'won_by_runs' | 'won_by_wickets' | 'tie' | 'super_over';
  matchId: string;
  tournamentId: string;
}

export function matchRulesFromMatch(match: Pick<Match, 'overs_per_innings'>): MatchRules {
  return rulesForFormat('custom', match.overs_per_innings);
}

async function fetchAllMatchEvents(matchId: string): Promise<ScoreEvent[]> {
  const { data: innings } = await supabase
    .from('innings')
    .select('id')
    .eq('match_id', matchId);
  if (!innings?.length) return [];

  const ids = innings.map((i) => i.id);
  const { data: events } = await supabase
    .from('score_events')
    .select('*')
    .in('innings_id', ids)
    .order('created_at', { ascending: true });

  return dedupeScoreEvents((events ?? []) as ScoreEvent[]);
}

function inningsLineFromReplay(
  inn: Innings,
  events: ScoreEvent[],
  rules: MatchRules
): { runs: number; wickets: number; legalBalls: number; line: string } {
  const snap = replayInnings(inn, events.filter((e) => e.innings_id === inn.id), rules);
  return {
    runs: snap.totalRuns,
    wickets: snap.totalWickets,
    legalBalls: snap.legalBalls,
    line: formatScoreLine(snap.totalRuns, snap.totalWickets, snap.legalBalls, rules.ballsPerOver),
  };
}

export async function buildMatchOutcome(
  match: Match & {
    team_a?: { id: string; name: string } | null;
    team_b?: { id: string; name: string } | null;
  }
): Promise<MatchOutcome | null> {
  const { innings: inningsList } = await fetchMatchInnings(match.id);
  const inn1 = inningsList.find((i) => i.innings_number === 1);
  const inn2 = inningsList.find((i) => i.innings_number === 2);
  if (!inn1 || !inn2 || inn1.status !== 'completed' || inn2.status !== 'completed') {
    return null;
  }

  const rules = matchRulesFromMatch(match);
  const allEvents = await fetchAllMatchEvents(match.id);

  const line1 = inningsLineFromReplay(inn1, allEvents, rules);
  const line2 = inningsLineFromReplay(inn2, allEvents, rules);

  const teamAName = match.team_a?.name ?? 'Team A';
  const teamBName = match.team_b?.name ?? 'Team B';
  const battingFirstId = inn1.batting_team_id;

  const result = calculateMatchResult({
    teamAName,
    teamBName,
    teamAId: match.team_a_id,
    teamBId: match.team_b_id,
    battingFirstTeamId: battingFirstId,
    innings1: { runs: line1.runs, wickets: line1.wickets, legalBalls: line1.legalBalls },
    innings2: { runs: line2.runs, wickets: line2.wickets, legalBalls: line2.legalBalls },
    rules,
  });

  const winnerName =
    result.winnerTeamId === match.team_a_id
      ? teamAName
      : result.winnerTeamId === match.team_b_id
        ? teamBName
        : '';

  return {
    winnerTeamId: result.winnerTeamId,
    winnerName,
    summary: result.summary,
    motm: null,
    innings1Line: `${inn1.batting_team_id === match.team_a_id ? teamAName : teamBName} ${line1.line}`,
    innings2Line: `${inn2.batting_team_id === match.team_a_id ? teamAName : teamBName} ${line2.line}`,
    kind: result.kind === 'in_progress' ? 'tie' : result.kind,
    matchId: match.id,
    tournamentId: match.tournament_id,
  };
}

export async function finalizeMatchWithMotm(
  matchId: string,
  outcome: MatchOutcome,
  motmPlayerId: string,
  motmPlayerName: string
): Promise<{ error: string | null; outcome: MatchOutcome }> {
  const summary = `${outcome.summary} Man of the Match: ${motmPlayerName}.`;

  let { error } = await supabase
    .from('matches')
    .update({
      status: 'completed',
      winner_team_id: outcome.winnerTeamId,
      result_summary: summary,
      man_of_the_match_player_id: motmPlayerId,
    })
    .eq('id', matchId);

  if (error?.message?.includes('man_of_the_match')) {
    const retry = await supabase
      .from('matches')
      .update({
        status: 'completed',
        winner_team_id: outcome.winnerTeamId,
        result_summary: summary,
      })
      .eq('id', matchId);
    error = retry.error;
  }

  if (error) return { error: error.message, outcome };

  const pointsErr = await updatePointsAfterMatch(matchId);
  if (pointsErr.error) return { error: pointsErr.error, outcome };

  const final: MatchOutcome = {
    ...outcome,
    summary,
    motm: { playerId: motmPlayerId, playerName: motmPlayerName },
  };

  return { error: null, outcome: final };
}

/** @deprecated use finalizeMatchWithMotm */
export async function finalizeMatch(matchId: string, _playerNames: Map<string, string>) {
  const { data: match } = await supabase
    .from('matches')
    .select(`*, team_a:teams!team_a_id(id, name), team_b:teams!team_b_id(id, name)`)
    .eq('id', matchId)
    .single();

  if (!match) return { error: 'Match not found', outcome: null };
  const outcome = await buildMatchOutcome(match as Match & { team_a?: { name: string }; team_b?: { name: string } });
  return { error: 'Use MOTM picker', outcome };
}

export type InningsEndStep =
  | { step: 'start_innings_2'; target: number }
  | { step: 'pick_motm'; outcome: MatchOutcome }
  | { step: 'innings_ended' };

export async function afterInningsCompleted(
  matchId: string,
  completedInnings: Innings
): Promise<{ error: string | null; next: InningsEndStep }> {
  await completeInnings(completedInnings.id);

  if (completedInnings.innings_number === 1) {
    const { data: inn } = await supabase
      .from('innings')
      .select('total_runs')
      .eq('id', completedInnings.id)
      .single();

    const runs = inn?.total_runs ?? completedInnings.total_runs;
    return { error: null, next: { step: 'start_innings_2', target: runs + 1 } };
  }

  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select(`*, team_a:teams!team_a_id(id, name), team_b:teams!team_b_id(id, name)`)
    .eq('id', matchId)
    .single();

  if (matchErr || !match) {
    return { error: matchErr?.message ?? 'Match not found', next: { step: 'innings_ended' } };
  }

  const outcome = await buildMatchOutcome(
    match as Match & { team_a?: { name: string }; team_b?: { name: string } }
  );
  if (!outcome) {
    return { error: 'Both innings must be completed', next: { step: 'innings_ended' } };
  }

  return { error: null, next: { step: 'pick_motm', outcome } };
}
