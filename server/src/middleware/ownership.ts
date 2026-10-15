import { canAccessTournament } from '../domain/access';
import type { Response } from 'express';
import type { AuthRequest } from './auth';
import { Tournament, Team, User } from '../models';
export async function ownsTournament(req: AuthRequest, res: Response, id: unknown, scoring = false) {
  const tournament = await Tournament.findById(id);
  const user = await User.findById(req.userId);
  if (!tournament) { res.status(404).json({ error: 'Tournament not found' }); return false; }
  if (!canAccessTournament(String(tournament.organizer_id),req.userId!,user?.role??'',(tournament.settings?.scorer_ids??[]).map(String),scoring)) {
    res.status(403).json({ error: 'Only the tournament organizer can make this change' }); return false;
  }
  return true;
}
export async function ownsTeam(req: AuthRequest, res: Response, id: unknown) {
  const team = await Team.findById(id);
  if (!team) { res.status(404).json({ error: 'Team not found' }); return false; }
  if (String(team.captain_id) === req.userId) return true;
  return ownsTournament(req, res, team.tournament_id);
}
