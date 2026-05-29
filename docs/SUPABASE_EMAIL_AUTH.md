# Email login setup (Supabase)

## Enable in dashboard

1. [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication** → **Providers** → **Email**
2. Turn **Enable Email provider** ON
3. Recommended for development:
   - **Confirm email** → OFF (instant login after signup)
   - Or leave ON and users must click the verification link
4. **Authentication** → **URL Configuration** → add redirect URL:
   - `cricketarena://reset-password` (for password reset)

## Sign up flow

- **Confirm email OFF**: user is logged in immediately after Create Account
- **Confirm email ON**: user sees “Check your email” then signs in after verifying

## Test account

Create via the app **Sign Up** tab, or in Dashboard → **Authentication** → **Users** → **Add user**.
