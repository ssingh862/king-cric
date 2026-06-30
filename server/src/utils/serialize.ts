import type { Types } from 'mongoose';
import { Team, Tournament } from '../models';
import { toApi } from '../models';

export function refId(value: Types.ObjectId | string | null | undefined): string | null {
  if (!value) return null;
  return String(value);
}

export async function teamSummary(teamId: Types.ObjectId | string | null | undefined) {
  if (!teamId) return null;
  const team = await Team.findById(teamId).lean();
  if (!team) return null;
  return {
    id: String(team._id),
    name: team.name,
    short_name: team.short_name,
    primary_color: team.primary_color,
    secondary_color: team.secondary_color,
    is_approved: team.is_approved,
    tournament_id: String(team.tournament_id),
    captain_id: team.captain_id ? String(team.captain_id) : null,
    logo_url: team.logo_url,
  };
}

export async function tournamentSummary(tournamentId: Types.ObjectId | string | null | undefined) {
  if (!tournamentId) return null;
  const t = await Tournament.findById(tournamentId).lean();
  if (!t) return null;
  return {
    id: String(t._id),
    name: t.name,
    city: t.city,
    organizer_id: String(t.organizer_id),
    status: t.status,
    format: t.format,
    overs_per_innings: t.overs_per_innings,
    venue: t.venue,
    slug: t.slug,
    description: t.description,
    logo_url: t.logo_url,
    max_teams: t.max_teams,
    start_date: t.start_date,
    end_date: t.end_date,
  };
}

export function mapInningsDoc(inn: Record<string, unknown>, battingTeam?: unknown, bowlingTeam?: unknown) {
  const base = toApi(inn as never) as Record<string, unknown>;
  return {
    ...base,
    match_id: refId(inn.match_id as Types.ObjectId),
    batting_team_id: refId(inn.batting_team_id as Types.ObjectId),
    bowling_team_id: refId(inn.bowling_team_id as Types.ObjectId),
    striker_player_id: refId(inn.striker_player_id as Types.ObjectId),
    non_striker_player_id: refId(inn.non_striker_player_id as Types.ObjectId),
    current_bowler_id: refId(inn.current_bowler_id as Types.ObjectId),
    batting_team: battingTeam ?? undefined,
    bowling_team: bowlingTeam ?? undefined,
  };
}

export function mapScoreEventDoc(ev: Record<string, unknown>) {
  const base = toApi(ev as never) as Record<string, unknown>;
  return {
    ...base,
    innings_id: refId(ev.innings_id as Types.ObjectId),
    dismissed_player_id: refId(ev.dismissed_player_id as Types.ObjectId),
    bowler_player_id: refId(ev.bowler_player_id as Types.ObjectId),
    striker_player_id: refId(ev.striker_player_id as Types.ObjectId),
    non_striker_player_id: refId(ev.non_striker_player_id as Types.ObjectId),
    created_by: refId(ev.created_by as Types.ObjectId),
    created_at: (ev.created_at as Date)?.toISOString?.() ?? ev.created_at,
  };
}

export function mapMatchDoc(
  match: Record<string, unknown>,
  teamA?: unknown,
  teamB?: unknown,
  tournament?: unknown
) {
  const base = toApi(match as never) as Record<string, unknown>;
  return {
    ...base,
    tournament_id: refId(match.tournament_id as Types.ObjectId),
    team_a_id: refId(match.team_a_id as Types.ObjectId),
    team_b_id: refId(match.team_b_id as Types.ObjectId),
    toss_winner_team_id: refId(match.toss_winner_team_id as Types.ObjectId),
    winner_team_id: refId(match.winner_team_id as Types.ObjectId),
    man_of_the_match_player_id: refId(match.man_of_the_match_player_id as Types.ObjectId),
    scheduled_at: (match.scheduled_at as Date)?.toISOString?.() ?? match.scheduled_at,
    team_a: teamA,
    team_b: teamB,
    tournament,
  };
}
