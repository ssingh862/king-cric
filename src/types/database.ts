export type UserRole = 'viewer' | 'player' | 'organizer' | 'admin';
export type TournamentStatus = 'draft' | 'registration' | 'ongoing' | 'completed' | 'cancelled';
export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'abandoned' | 'no_result';
export type BallType =
  | 'dot' | 'one' | 'two' | 'three' | 'four' | 'six'
  | 'wide' | 'no_ball' | 'bye' | 'leg_bye' | 'wicket';

export type WicketType =
  | 'bowled' | 'caught' | 'lbw' | 'run_out' | 'stumped'
  | 'hit_wicket' | 'retired' | 'obstructing' | 'timed_out' | 'other';

export interface Profile {
  id: string;
  phone: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_premium: boolean;
  expo_push_token: string | null;
}

export interface Tournament {
  id: string;
  organizer_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  venue: string | null;
  city: string | null;
  format: string;
  overs_per_innings: number;
  max_teams: number;
  status: TournamentStatus;
  start_date: string | null;
  end_date: string | null;
}

export interface Team {
  id: string;
  tournament_id: string;
  captain_id: string | null;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  is_approved: boolean;
}

export interface Player {
  id: string;
  team_id: string;
  profile_id: string | null;
  full_name: string;
  jersey_number: number | null;
  role: string;
  is_captain: boolean;
  is_wicket_keeper: boolean;
}

export interface Match {
  id: string;
  tournament_id: string;
  team_a_id: string;
  team_b_id: string;
  venue: string | null;
  scheduled_at: string | null;
  status: MatchStatus;
  toss_winner_team_id: string | null;
  toss_decision: string | null;
  winner_team_id: string | null;
  result_summary: string | null;
  man_of_the_match_player_id: string | null;
  overs_per_innings: number;
  team_a?: Team;
  team_b?: Team;
}

export interface Innings {
  id: string;
  match_id: string;
  batting_team_id: string;
  bowling_team_id: string;
  innings_number: number;
  status: string;
  total_runs: number;
  total_wickets: number;
  total_overs: number;
  target_runs: number | null;
  striker_player_id: string | null;
  non_striker_player_id: string | null;
  current_bowler_id: string | null;
}

export interface ScoreEvent {
  id: string;
  innings_id: string;
  over_number: number;
  ball_number: number;
  ball_in_over: number;
  ball_type: BallType;
  runs_off_bat: number;
  extras: number;
  is_wicket: boolean;
  wicket_type: string | null;
  dismissed_player_id?: string | null;
  bowler_player_id?: string | null;
  striker_player_id?: string | null;
  non_striker_player_id?: string | null;
  commentary: string | null;
  is_legal_delivery: boolean;
  created_at: string;
}

export interface PointsTableRow {
  id: string;
  tournament_id: string;
  team_id: string;
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  net_run_rate: number;
  team?: Team;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_inr: number;
  duration_days: number;
  max_tournaments: number;
  features: string[];
}

export interface PlayerMatchStats {
  id: string;
  match_id: string;
  player_id: string;
  runs_scored: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  wickets_taken: number;
  overs_bowled: number;
  runs_conceded: number;
  player?: Player;
}
