-- Local Cricket Tournaments — Full PostgreSQL Schema
-- Run via: supabase db push

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('viewer', 'player', 'organizer', 'admin');
CREATE TYPE tournament_status AS ENUM ('draft', 'registration', 'ongoing', 'completed', 'cancelled');
CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'completed', 'abandoned', 'no_result');
CREATE TYPE innings_status AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE ball_type AS ENUM (
  'dot', 'one', 'two', 'three', 'four', 'six',
  'wide', 'no_ball', 'bye', 'leg_bye', 'wicket'
);
CREATE TYPE wicket_type AS ENUM (
  'bowled', 'caught', 'lbw', 'run_out', 'stumped',
  'hit_wicket', 'retired', 'obstructing', 'timed_out', 'other'
);
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'trial');
CREATE TYPE payment_status AS ENUM ('pending', 'captured', 'failed', 'refunded');

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  expo_push_token TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Subscription plans
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_inr INTEGER NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  max_tournaments INTEGER,
  features JSONB NOT NULL DEFAULT '[]',
  razorpay_plan_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  status subscription_status NOT NULL DEFAULT 'trial',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  razorpay_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- Payments (Razorpay)
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  amount_inr INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status payment_status NOT NULL DEFAULT 'pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_razorpay_order ON public.payments(razorpay_order_id);

-- Tournaments
CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  venue TEXT,
  city TEXT,
  format TEXT NOT NULL DEFAULT 'T20',
  overs_per_innings INTEGER NOT NULL DEFAULT 20,
  max_teams INTEGER NOT NULL DEFAULT 8,
  status tournament_status NOT NULL DEFAULT 'draft',
  start_date DATE,
  end_date DATE,
  registration_deadline TIMESTAMPTZ,
  points_win INTEGER NOT NULL DEFAULT 2,
  points_tie INTEGER NOT NULL DEFAULT 1,
  points_loss INTEGER NOT NULL DEFAULT 0,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organizer_id, slug)
);

CREATE INDEX idx_tournaments_organizer ON public.tournaments(organizer_id);
CREATE INDEX idx_tournaments_status ON public.tournaments(status);
CREATE INDEX idx_tournaments_city ON public.tournaments(city);

-- Teams
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  captain_id UUID REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  short_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#FF6B00',
  secondary_color TEXT DEFAULT '#1A0A2E',
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, name)
);

CREATE INDEX idx_teams_tournament ON public.teams(tournament_id);
CREATE INDEX idx_teams_captain ON public.teams(captain_id);

-- Players
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id),
  full_name TEXT NOT NULL,
  jersey_number INTEGER,
  role TEXT DEFAULT 'all_rounder',
  batting_style TEXT,
  bowling_style TEXT,
  is_captain BOOLEAN NOT NULL DEFAULT FALSE,
  is_wicket_keeper BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, jersey_number)
);

CREATE INDEX idx_players_team ON public.players(team_id);
CREATE INDEX idx_players_profile ON public.players(profile_id);

-- Tournament registrations
CREATE TABLE public.tournament_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  registered_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, team_id)
);

-- Points table (materialized per tournament)
CREATE TABLE public.points_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  tied INTEGER NOT NULL DEFAULT 0,
  no_result INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  net_run_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  runs_for INTEGER NOT NULL DEFAULT 0,
  runs_against INTEGER NOT NULL DEFAULT 0,
  overs_for NUMERIC(6,1) NOT NULL DEFAULT 0,
  overs_against NUMERIC(6,1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, team_id)
);

CREATE INDEX idx_points_table_tournament ON public.points_table(tournament_id);

-- Matches
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_a_id UUID NOT NULL REFERENCES public.teams(id),
  team_b_id UUID NOT NULL REFERENCES public.teams(id),
  venue TEXT,
  scheduled_at TIMESTAMPTZ,
  status match_status NOT NULL DEFAULT 'scheduled',
  toss_winner_team_id UUID REFERENCES public.teams(id),
  toss_decision TEXT,
  winner_team_id UUID REFERENCES public.teams(id),
  result_summary TEXT,
  overs_per_innings INTEGER NOT NULL DEFAULT 20,
  current_innings_number INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (team_a_id <> team_b_id)
);

CREATE INDEX idx_matches_tournament ON public.matches(tournament_id);
CREATE INDEX idx_matches_status ON public.matches(status);
CREATE INDEX idx_matches_scheduled ON public.matches(scheduled_at);

-- Innings
CREATE TABLE public.innings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  batting_team_id UUID NOT NULL REFERENCES public.teams(id),
  bowling_team_id UUID NOT NULL REFERENCES public.teams(id),
  innings_number INTEGER NOT NULL CHECK (innings_number IN (1, 2)),
  status innings_status NOT NULL DEFAULT 'not_started',
  total_runs INTEGER NOT NULL DEFAULT 0,
  total_wickets INTEGER NOT NULL DEFAULT 0,
  total_overs NUMERIC(4,1) NOT NULL DEFAULT 0,
  extras_wide INTEGER NOT NULL DEFAULT 0,
  extras_no_ball INTEGER NOT NULL DEFAULT 0,
  extras_bye INTEGER NOT NULL DEFAULT 0,
  extras_leg_bye INTEGER NOT NULL DEFAULT 0,
  target_runs INTEGER,
  striker_player_id UUID REFERENCES public.players(id),
  non_striker_player_id UUID REFERENCES public.players(id),
  current_bowler_id UUID REFERENCES public.players(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_id, innings_number)
);

CREATE INDEX idx_innings_match ON public.innings(match_id);

-- Ball-by-ball score events (realtime source)
CREATE TABLE public.score_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  innings_id UUID NOT NULL REFERENCES public.innings(id) ON DELETE CASCADE,
  over_number INTEGER NOT NULL,
  ball_number INTEGER NOT NULL CHECK (ball_number BETWEEN 1 AND 6),
  ball_in_over INTEGER NOT NULL,
  ball_type ball_type NOT NULL,
  runs_off_bat INTEGER NOT NULL DEFAULT 0,
  extras INTEGER NOT NULL DEFAULT 0,
  is_wicket BOOLEAN NOT NULL DEFAULT FALSE,
  wicket_type wicket_type,
  dismissed_player_id UUID REFERENCES public.players(id),
  bowler_player_id UUID REFERENCES public.players(id),
  striker_player_id UUID REFERENCES public.players(id),
  non_striker_player_id UUID REFERENCES public.players(id),
  commentary TEXT,
  is_legal_delivery BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX idx_score_events_innings ON public.score_events(innings_id);
CREATE INDEX idx_score_events_created ON public.score_events(created_at DESC);

-- Player match statistics (aggregated)
CREATE TABLE public.player_match_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  runs_scored INTEGER NOT NULL DEFAULT 0,
  balls_faced INTEGER NOT NULL DEFAULT 0,
  fours INTEGER NOT NULL DEFAULT 0,
  sixes INTEGER NOT NULL DEFAULT 0,
  is_out BOOLEAN NOT NULL DEFAULT FALSE,
  dismissal_info TEXT,
  overs_bowled NUMERIC(4,1) NOT NULL DEFAULT 0,
  runs_conceded INTEGER NOT NULL DEFAULT 0,
  wickets_taken INTEGER NOT NULL DEFAULT 0,
  maidens INTEGER NOT NULL DEFAULT 0,
  catches INTEGER NOT NULL DEFAULT 0,
  stumpings INTEGER NOT NULL DEFAULT 0,
  UNIQUE(match_id, player_id)
);

CREATE INDEX idx_player_match_stats_match ON public.player_match_stats(match_id);
CREATE INDEX idx_player_match_stats_player ON public.player_match_stats(player_id);

-- Push notification queue
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tournaments_updated_at BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER matches_updated_at BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER innings_updated_at BEFORE UPDATE ON public.innings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, full_name)
  VALUES (
    NEW.id,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Cricket Fan')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sync innings totals from score events
CREATE OR REPLACE FUNCTION public.sync_innings_from_event()
RETURNS TRIGGER AS $$
DECLARE
  v_innings public.innings%ROWTYPE;
  v_runs INTEGER;
  v_wickets INTEGER;
  v_legal_balls INTEGER;
BEGIN
  SELECT * INTO v_innings FROM public.innings WHERE id = NEW.innings_id;

  SELECT
    COALESCE(SUM(runs_off_bat + extras), 0),
    COUNT(*) FILTER (WHERE is_wicket),
    COUNT(*) FILTER (WHERE is_legal_delivery)
  INTO v_runs, v_wickets, v_legal_balls
  FROM public.score_events
  WHERE innings_id = NEW.innings_id;

  UPDATE public.innings SET
    total_runs = v_runs,
    total_wickets = v_wickets,
    total_overs = FLOOR(v_legal_balls / 6) + (v_legal_balls % 6) * 0.1,
    status = CASE
      WHEN v_wickets >= 10 OR (v_legal_balls >= v_innings.target_runs AND v_innings.innings_number = 2) THEN 'completed'::innings_status
      ELSE 'in_progress'::innings_status
    END,
    striker_player_id = NEW.striker_player_id,
    non_striker_player_id = NEW.non_striker_player_id,
    current_bowler_id = NEW.bowler_player_id
  WHERE id = NEW.innings_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_score_event_insert
  AFTER INSERT ON public.score_events
  FOR EACH ROW EXECUTE FUNCTION public.sync_innings_from_event();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.score_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.innings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

-- Seed subscription plans
INSERT INTO public.subscription_plans (name, slug, description, price_inr, duration_days, max_tournaments, features, sort_order) VALUES
  ('Free', 'free', 'Watch live scores & follow tournaments', 0, 365, 0, '["live_scores","follow_teams"]', 0),
  ('Starter', 'starter', 'Organize up to 2 tournaments', 499, 30, 2, '["live_scores","scoring","points_table","2_tournaments"]', 1),
  ('Pro', 'pro', 'Unlimited tournaments + analytics', 999, 30, 999, '["live_scores","scoring","points_table","unlimited_tournaments","analytics","push_notifications"]', 2),
  ('Club', 'club', 'For cricket clubs & academies', 2499, 90, 999, '["all_pro","multi_organizer","custom_branding","priority_support"]', 3);
