import type { ScoreEvent } from '../../types/database';

/** e.g. "1 4 W 0 2 1" */
export function formatOverSummary(balls: ScoreEvent[]): string {
  return balls.map(ballSymbol).join(' ');
}

export function ballSymbol(e: ScoreEvent): string {
  if (e.is_wicket) return 'W';
  if (e.ball_type === 'wide') {
    const extra = e.extras > 1 ? `+${e.extras}` : '';
    return `Wd${extra}`;
  }
  if (e.ball_type === 'no_ball') {
    const extra = e.extras > 1 ? `+${e.extras}` : '';
    return `Nb${extra}`;
  }
  const total = e.runs_off_bat + e.extras;
  if (total === 0) return '0';
  return String(total);
}
