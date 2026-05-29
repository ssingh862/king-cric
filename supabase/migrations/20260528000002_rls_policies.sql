-- Row Level Security Policies

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.innings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Helper: is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: is organizer with active subscription
CREATE OR REPLACE FUNCTION public.can_manage_tournaments()
RETURNS BOOLEAN AS $$
  SELECT auth.uid() IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Subscription plans (public read)
CREATE POLICY "Plans are public"
  ON public.subscription_plans FOR SELECT USING (is_active = true);

-- Subscriptions
CREATE POLICY "Users view own subscriptions"
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own subscriptions"
  ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Payments
CREATE POLICY "Users view own payments"
  ON public.payments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own payments"
  ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tournaments
CREATE POLICY "Tournaments are publicly readable"
  ON public.tournaments FOR SELECT USING (status <> 'draft' OR organizer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Organizers create tournaments"
  ON public.tournaments FOR INSERT
  WITH CHECK (auth.uid() = organizer_id AND public.can_manage_tournaments());

CREATE POLICY "Organizers update own tournaments"
  ON public.tournaments FOR UPDATE
  USING (organizer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Organizers delete own tournaments"
  ON public.tournaments FOR DELETE
  USING (organizer_id = auth.uid() OR public.is_admin());

-- Teams
CREATE POLICY "Teams are publicly readable"
  ON public.teams FOR SELECT USING (true);

CREATE POLICY "Authenticated users create teams"
  ON public.teams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Captain or organizer updates team"
  ON public.teams FOR UPDATE
  USING (
    captain_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = teams.tournament_id AND t.organizer_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Players
CREATE POLICY "Players are publicly readable"
  ON public.players FOR SELECT USING (true);

CREATE POLICY "Team captains manage players"
  ON public.players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.teams tm
      WHERE tm.id = players.team_id AND tm.captain_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Matches
CREATE POLICY "Matches are publicly readable"
  ON public.matches FOR SELECT USING (true);

CREATE POLICY "Organizers manage matches"
  ON public.matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = matches.tournament_id AND t.organizer_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Innings
CREATE POLICY "Innings are publicly readable"
  ON public.innings FOR SELECT USING (true);

CREATE POLICY "Organizers manage innings"
  ON public.innings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.tournaments t ON t.id = m.tournament_id
      WHERE m.id = innings.match_id AND t.organizer_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Score events (realtime scoring)
CREATE POLICY "Score events are publicly readable"
  ON public.score_events FOR SELECT USING (true);

CREATE POLICY "Scorers can insert events"
  ON public.score_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.innings i
      JOIN public.matches m ON m.id = i.match_id
      JOIN public.tournaments t ON t.id = m.tournament_id
      WHERE i.id = innings_id AND (t.organizer_id = auth.uid() OR public.is_admin())
    )
  );

-- Points table
CREATE POLICY "Points table is public"
  ON public.points_table FOR SELECT USING (true);

CREATE POLICY "Organizers update points"
  ON public.points_table FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = points_table.tournament_id AND t.organizer_id = auth.uid()
    )
    OR public.is_admin()
  );

-- Player stats
CREATE POLICY "Player stats are public"
  ON public.player_match_stats FOR SELECT USING (true);

CREATE POLICY "System manages player stats"
  ON public.player_match_stats FOR ALL
  USING (public.is_admin() OR auth.uid() IS NOT NULL);

-- Registrations
CREATE POLICY "Registrations readable"
  ON public.tournament_registrations FOR SELECT USING (true);

CREATE POLICY "Users register teams"
  ON public.tournament_registrations FOR INSERT
  WITH CHECK (auth.uid() = registered_by);

-- Notifications
CREATE POLICY "Users see own notifications"
  ON public.notification_logs FOR SELECT USING (auth.uid() = user_id);
