-- Organizers can manage players on any team in their tournaments

CREATE POLICY "Organizers manage tournament players"
  ON public.players FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.teams tm
      JOIN public.tournaments t ON t.id = tm.tournament_id
      WHERE tm.id = players.team_id AND t.organizer_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams tm
      JOIN public.tournaments t ON t.id = tm.tournament_id
      WHERE tm.id = players.team_id AND t.organizer_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.teams tm
      WHERE tm.id = players.team_id AND tm.captain_id = auth.uid()
    )
    OR public.is_admin()
  );
