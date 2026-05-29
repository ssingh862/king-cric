/** Map Supabase auth errors to user-friendly messages */
export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email first. Check your inbox for the verification link.';
  }
  if (lower.includes('user already registered') || lower.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('password') && lower.includes('least')) {
    return 'Password must be at least 6 characters.';
  }
  if (lower.includes('unable to validate email') || lower.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (lower.includes('signup') && lower.includes('disabled')) {
    return 'Sign ups are disabled. Enable Email provider in Supabase Auth settings.';
  }
  if (lower.includes('unsupported phone provider') || lower.includes('phone_provider_disabled')) {
    return 'SMS is not configured. Use email login or set up Twilio in Supabase.';
  }

  return message;
}
