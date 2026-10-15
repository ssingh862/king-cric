/** Pure scoring policy shared by API validation and regression tests. */
export const defaultRules = {
  widePenaltyRuns: 1, noBallPenaltyRuns: 1, wideCountsAsBall: false,
  noBallCountsAsBall: false, freeHitOnNoBall: true, lastBatterStands: false,
  allowByes: true, allowLegByes: true,
};
export type LocalRules = typeof defaultRules;
export function validateRules(input: unknown): LocalRules {
  if (input == null) return { ...defaultRules };
  if (typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid match rules');
  const rules = { ...defaultRules };
  for (const key of Object.keys(rules) as (keyof LocalRules)[]) {
    const value = (input as Record<string, unknown>)[key];
    if (value === undefined) continue;
    if (typeof rules[key] === 'number') {
      if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 5) throw new Error('Extra penalties must be 0–5 runs');
    } else if (typeof value !== 'boolean') throw new Error(`Invalid ${key}`);
    Object.assign(rules, { [key]: value });
  }
  return rules;
}
export function legalDelivery(type: string, rules: LocalRules) {
  return type === 'wide' ? rules.wideCountsAsBall : type === 'no_ball' ? rules.noBallCountsAsBall : true;
}
export function rotationRuns(type: string, runs: number, extras: number, rules: LocalRules) {
  return runs + extras - (type === 'wide' ? rules.widePenaltyRuns : type === 'no_ball' ? rules.noBallPenaltyRuns : 0);
}
export function validateBall(body: Record<string, unknown>, rules: LocalRules, freeHit: boolean) {
  const type = String(body.ball_type);
  if (!['dot','one','two','three','four','six','wide','no_ball','bye','leg_bye','wicket'].includes(type)) throw new Error('Unknown ball outcome');
  const runs = Number(body.runs_off_bat ?? 0), extras = Number(body.extras ?? 0);
  if (![runs, extras].every(n => Number.isInteger(n) && n >= 0 && n <= 20)) throw new Error('Runs must be whole numbers from 0 to 20');
  if (type === 'wide' && (runs !== 0 || extras < rules.widePenaltyRuns)) throw new Error('A wide is extras only, including the configured penalty');
  if (type === 'no_ball' && extras < rules.noBallPenaltyRuns) throw new Error('Include the configured no-ball penalty');
  if (type === 'bye' && !rules.allowByes || type === 'leg_bye' && !rules.allowLegByes) throw new Error('This extra is disabled for this match');
  const wicket = body.is_wicket === true;
  const wt = wicket ? String(body.wicket_type) : null;
  if (wicket && !['bowled','caught','lbw','run_out','stumped','hit_wicket','retired','obstructing','timed_out','other'].includes(wt!)) throw new Error('Choose a dismissal type');
  if (wicket && (freeHit || type === 'no_ball') && !['run_out','obstructing'].includes(wt!)) throw new Error('Only run out or obstructing is supported on a no-ball or free hit');
  if (wicket && type === 'wide' && !['run_out','stumped','hit_wicket','obstructing'].includes(wt!)) throw new Error('Invalid dismissal on a wide');
  if (wicket && ['bowled','caught','lbw','stumped','hit_wicket'].includes(wt!) && runs + (type === 'wide' ? 0 : extras) > 0) throw new Error('This dismissal cannot include completed runs');
  return { ball_type: type, runs_off_bat: runs, extras, is_wicket: wicket, wicket_type: wt, is_legal_delivery: legalDelivery(type, rules) };
}
