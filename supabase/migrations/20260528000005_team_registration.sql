-- Auto-create points table row when a team joins a tournament

CREATE OR REPLACE FUNCTION public.init_points_for_team()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.points_table (tournament_id, team_id)
  VALUES (NEW.tournament_id, NEW.id)
  ON CONFLICT (tournament_id, team_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_team_created_init_points ON public.teams;
CREATE TRIGGER on_team_created_init_points
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.init_points_for_team();
