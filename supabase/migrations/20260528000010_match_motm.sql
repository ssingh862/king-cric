-- Man of the match (chosen after the game)

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS man_of_the_match_player_id UUID REFERENCES public.players(id);
