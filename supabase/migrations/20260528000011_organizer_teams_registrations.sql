-- Only the tournament organizer (or admin) can create teams and tournament registrations.
-- Everyone else can still read tournaments, matches, scores, and points.

DROP POLICY IF EXISTS "Authenticated users create teams" ON public.teams;
CREATE POLICY "Organizers create teams in own tournament"
  ON public.teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = teams.tournament_id AND t.organizer_id = auth.uid()
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users register teams" ON public.tournament_registrations;
CREATE POLICY "Organizers register teams"
  ON public.tournament_registrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = tournament_registrations.tournament_id AND t.organizer_id = auth.uid()
    )
    OR public.is_admin()
  );
