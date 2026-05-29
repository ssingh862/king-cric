-- Stop overwriting on-crease players with pre-ball striker from each insert.
-- The app syncs post-ball striker/non-striker after every ball and when picking a new batsman.

CREATE OR REPLACE FUNCTION public.sync_innings_from_event()
RETURNS TRIGGER AS $$
DECLARE
  v_runs INTEGER;
  v_wickets INTEGER;
  v_legal_balls INTEGER;
BEGIN
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
      WHEN v_wickets >= 10 THEN 'completed'::innings_status
      ELSE 'in_progress'::innings_status
    END
  WHERE id = NEW.innings_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
