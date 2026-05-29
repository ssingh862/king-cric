-- All logged-in users can organize tournaments (no subscription required)

CREATE OR REPLACE FUNCTION public.can_manage_tournaments()
RETURNS BOOLEAN AS $$
  SELECT auth.uid() IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Mark all plans as free / informational (optional)
UPDATE public.subscription_plans
SET price_inr = 0, description = 'All features are free'
WHERE slug IN ('starter', 'pro', 'club');
