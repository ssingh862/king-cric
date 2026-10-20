import type { MatchFormatKind, MatchRules } from './types';

const DEFAULT: Omit<MatchRules, 'kind' | 'oversPerInnings'> = {
  maxWickets: 10,
  ballsPerOver: 6,
  widePenaltyRuns: 1,
  noBallPenaltyRuns: 1,
  freeHitOnNoBall: true,
  superOverOvers: 1,
};

export function rulesForFormat(
  kind: MatchFormatKind,
  oversPerInnings: number,
  overrides?: Partial<MatchRules>
): MatchRules {
  const base: MatchRules = {
    kind,
    oversPerInnings,
    ...DEFAULT,
    ...overrides,
  };

  switch (kind) {
    case 't20':
      return { ...base, kind: 't20', oversPerInnings: oversPerInnings || 20 };
    case 'odi':
      return { ...base, kind: 'odi', oversPerInnings: oversPerInnings || 50 };
    case 'local':
      return {
        ...base,
        kind: 'local',
        oversPerInnings: oversPerInnings || 20,
        freeHitOnNoBall: false,
      };
    case 'tennis':
      return {
        ...base,
        kind: 'tennis',
        oversPerInnings: oversPerInnings || 8,
        maxWickets: 5,
        ballsPerOver: 6,
        freeHitOnNoBall: false,
      };
    case 'custom':
      return { ...base, kind: 'custom', oversPerInnings };
    default:
      return base;
  }
}

export function formatLabel(kind: MatchFormatKind): string {
  const labels: Record<MatchFormatKind, string> = {
    t20: 'T20',
    odi: 'ODI',
    local: 'Local cricket',
    tennis: 'Tennis ball',
    custom: 'Custom',
  };
  return labels[kind];
}

export function inferFormatFromOvers(overs: number): MatchFormatKind {
  if (overs <= 8) return 'tennis';
  if (overs <= 20) return 't20';
  if (overs <= 30) return 'local';
  if (overs >= 45) return 'odi';
  return 'custom';
}
