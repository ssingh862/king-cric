import type { Innings, Match, ScoreEvent } from '../types/database';
import { calculateMatchResult, formatScoreLine } from './cricket/result';
import { maxWicketsForSquad } from './cricket/rules';
import { replayInnings, dedupeScoreEvents } from './cricket';
import { rulesForFormat } from './cricket/formats';
import type { MatchRules } from './cricket/types';
import { completeInnings, fetchMatchInnings, fetchTeamPlayers } from './matches';
import { pickManOfTheMatch } from './cricket/motm';
import { api, apiSafe } from './api';

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
  const data = await api<{
    eventsByInnings: Record<string, ScoreEvent[]>;
  }>(`/matches/${matchId}/score-events`);

  const all: ScoreEvent[] = [];
  for (const events of Object.values(data.eventsByInnings ?? {})) {
    all.push(...events);
  }
  return dedupeScoreEvents(all);
}

function inningsLineFromReplay(
  inn: Innings,
  events: ScoreEvent[],
  rules: MatchRules
): { runs: number; wickets: number; legalBalls: number; line: string } {
  const snap = replayInnings(inn, events.filter((e) => e.innings_id === inn.id), rules);
  const runs = inn.status === 'completed' ? inn.total_runs : snap.totalRuns;
  const wickets = inn.status === 'completed' ? inn.total_wickets : snap.totalWickets;
  const legalBalls = snap.legalBalls;
  return {
    runs,
    wickets,
    legalBalls,
    line: formatScoreLine(runs, wickets, legalBalls, rules.ballsPerOver),
  };
}

async function rulesForInningsTeam(
  match: Pick<Match, 'overs_per_innings'>,
  battingTeamId: string
): Promise<MatchRules> {
  const base = rulesForFormat('custom', match.overs_per_innings);
  const { players } = await fetchTeamPlayers(battingTeamId);
  const squadSize = players.length;
  if (squadSize > 0) {
    return { ...base, maxWickets: maxWicketsForSquad(squadSize), battingSquadSize: squadSize };
  }
  return base;
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
  const rules2 = await rulesForInningsTeam(match, inn2.batting_team_id);
  const allEvents = await fetchAllMatchEvents(match.id);

  const line1 = inningsLineFromReplay(inn1 as Innings, allEvents, rules);
  const line2 = inningsLineFromReplay(inn2 as Innings, allEvents, rules2);

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
    rules: rules2,
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
  motmPlayerName: string,
  motmReason?: string
): Promise<{ error: string | null; outcome: MatchOutcome }> {
  const reasonBit = motmReason ? ` (${motmReason})` : '';
  const summary = `${outcome.summary} Player of the Match: ${motmPlayerName}${reasonBit}.`;

  const { error } = await apiSafe(`/matches/${matchId}/finalize`, {
    method: 'POST',
    body: JSON.stringify({
      winner_team_id: outcome.winnerTeamId,
      result_summary: summary,
      man_of_the_match_player_id: motmPlayerId,
    }),
  });

  if (error) return { error, outcome };

  const final: MatchOutcome = {
    ...outcome,
    summary,
    motm: { playerId: motmPlayerId, playerName: motmPlayerName, reason: motmReason },
  };

  return { error: null, outcome: final };
}

/** Pick POTM from match stats and save the completed result. */
export async function autoFinalizeMatch(
  matchId: string,
  playerNames: Map<string, string>,
  playerTeamIds?: Map<string, string>
): Promise<{ error: string | null; outcome: MatchOutcome | null }> {
  const { data: match, error: matchErr } = await apiSafe<
    Match & { team_a?: { name: string }; team_b?: { name: string } }
  >(`/matches/${matchId}`);

  if (matchErr || !match) {
    return { error: matchErr ?? 'Match not found', outcome: null };
  }

  const outcome = await buildMatchOutcome(match);
  if (!outcome) {
    return { error: 'Both innings must be completed', outcome: null };
  }

  const allEvents = await fetchAllMatchEvents(matchId);
  const motm = pickManOfTheMatch(allEvents, playerNames, {
    winnerTeamId: outcome.winnerTeamId,
    playerTeamIds,
  });

  if (!motm) {
    const fallbackId = [...playerNames.keys()][0];
    if (!fallbackId) {
      return { error: 'No players found for Player of the Match', outcome: null };
    }
    return finalizeMatchWithMotm(
      matchId,
      outcome,
      fallbackId,
      playerNames.get(fallbackId) ?? 'Player'
    );
  }

  return finalizeMatchWithMotm(
    matchId,
    outcome,
    motm.playerId,
    motm.playerName,
    motm.reason
  );
}

export async function finalizeMatch(matchId: string, _playerNames: Map<string, string>) {
  const match = await api<Match & { team_a?: { name: string }; team_b?: { name: string } }>(
    `/matches/${matchId}`
  );
  if (!match) return { error: 'Match not found', outcome: null };
  const outcome = await buildMatchOutcome(match);
  return { error: 'Use MOTM picker', outcome };
}

export type InningsEndStep =
  | { step: 'start_innings_2'; target: number }
  | { step: 'finalize_match' }
  | { step: 'innings_ended' };

export async function afterInningsCompleted(
  matchId: string,
  completedInnings: Innings
): Promise<{ error: string | null; next: InningsEndStep }> {
  await completeInnings(completedInnings.id);

  if (completedInnings.innings_number === 1) {
    return { error: null, next: { step: 'start_innings_2', target: completedInnings.total_runs + 1 } };
  }

  const { data: match, error: matchErr } = await apiSafe<
    Match & { team_a?: { name: string }; team_b?: { name: string } }
  >(`/matches/${matchId}`);

  if (matchErr || !match) {
    return { error: matchErr ?? 'Match not found', next: { step: 'innings_ended' } };
  }

  const outcome = await buildMatchOutcome(match);
  if (!outcome) {
    return { error: 'Both innings must be completed', next: { step: 'innings_ended' } };
  }

  return { error: null, next: { step: 'finalize_match' } };
}

/** True when both innings are done but match is not finalized yet. */
export function matchNeedsMotm(
  match: Pick<Match, 'status'> | null | undefined,
  inningsList: Pick<Innings, 'innings_number' | 'status'>[] | null | undefined
): boolean {
  if (!match || match.status === 'completed') return false;
  const inn1 = inningsList?.find((i) => i.innings_number === 1);
  const inn2 = inningsList?.find((i) => i.innings_number === 2);
  return inn1?.status === 'completed' && inn2?.status === 'completed';
}
