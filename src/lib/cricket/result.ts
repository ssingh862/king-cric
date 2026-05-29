import type { MatchRules } from './types';

export interface InningsScoreLine {
  runs: number;
  wickets: number;
  legalBalls: number;
}

export interface MatchResultInput {
  teamAName: string;
  teamBName: string;
  teamAId: string;
  teamBId: string;
  innings1: InningsScoreLine;
  innings2: InningsScoreLine | null;
  battingFirstTeamId: string;
  rules: MatchRules;
  superOver?: boolean;
}

export function formatScoreLine(
  runs: number,
  wickets: number,
  legalBalls: number,
  ballsPerOver = 6
): string {
  const overs = Math.floor(legalBalls / ballsPerOver);
  const balls = legalBalls % ballsPerOver;
  return `${runs}/${wickets} (${overs}.${balls})`;
}

export function calculateMatchResult(input: MatchResultInput): {
  kind: 'won_by_runs' | 'won_by_wickets' | 'tie' | 'super_over' | 'in_progress';
  winnerTeamId: string | null;
  summary: string;
} {
  const { innings1, innings2, teamAName, teamBName, teamAId, teamBId, battingFirstTeamId } =
    input;

  if (!innings2) {
    return { kind: 'in_progress', winnerTeamId: null, summary: 'Match in progress' };
  }

  const firstRuns = innings1.runs;
  const secondRuns = innings2.runs;
  const chasingTeamId =
    battingFirstTeamId === teamAId ? teamBId : teamAId;
  const defendingTeamId = battingFirstTeamId;
  const chasingName = chasingTeamId === teamAId ? teamAName : teamBName;
  const defendingName = defendingTeamId === teamAId ? teamAName : teamBName;

  if (secondRuns > firstRuns) {
    const wicketsLeft = input.rules.maxWickets - innings2.wickets;
    return {
      kind: 'won_by_wickets',
      winnerTeamId: chasingTeamId,
      summary: `${chasingName} won by ${wicketsLeft} wicket${wicketsLeft === 1 ? '' : 's'}`,
    };
  }

  if (secondRuns < firstRuns) {
    const margin = firstRuns - secondRuns;
    return {
      kind: 'won_by_runs',
      winnerTeamId: defendingTeamId,
      summary: `${defendingName} won by ${margin} run${margin === 1 ? '' : 's'}`,
    };
  }

  return {
    kind: 'tie',
    winnerTeamId: null,
    summary: 'Match tied — super over optional',
  };
}

export function superOverSummary(winnerName: string): string {
  return `${winnerName} won the super over`;
}
