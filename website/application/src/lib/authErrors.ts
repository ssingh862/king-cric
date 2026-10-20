/** Map API auth errors to user-friendly messages */
export function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('network request failed') || lower.includes('failed to fetch')) {
    return 'Cannot reach the API server. Use your computer\'s LAN IP in .env (not localhost) and ensure the server is running.';
  }
  if (lower.includes('incorrect email or password') || lower.includes('invalid credentials')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (lower.includes('already exists')) {
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
  if (lower.includes('unauthorized') || lower.includes('invalid token')) {
    return 'Session expired. Please sign in again.';
  }

  return message;
}
