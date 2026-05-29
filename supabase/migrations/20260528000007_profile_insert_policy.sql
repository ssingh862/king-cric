-- Allow users to create their own profile if the signup trigger did not run

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
