/** Only scoring fields may be changed by a delegated scorer. */
export function isScoringMutation(method: string, path: string, body: Record<string, unknown>): boolean {
  const fields = ['status','winner_team_id','result_summary','man_of_the_match_player_id','toss_winner_team_id','toss_decision','current_innings_number'];
  if(method === 'PATCH' && /^\/[^/]+$/.test(path)) return Object.keys(body).length>0 && Object.keys(body).every(key=>fields.includes(key));
  return (method==='POST' && /^\/[^/]+\/finalize$/.test(path)) || path.startsWith('/innings/') || path.startsWith('/score-events/') || (path.endsWith('/innings') && method==='POST');
}
export function canAccessTournament(ownerId: string, userId: string, role: string, scorerIds: string[], scoring: boolean): boolean {
  return role==='admin' || ownerId===userId || (scoring && scorerIds.includes(userId));
}
export function validSession(version: number | undefined, userVersion: number | undefined, suspended: boolean): boolean {
  return !suspended && (version??0)===(userVersion??0);
}
