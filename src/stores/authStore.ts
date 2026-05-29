import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { mapAuthError } from '../lib/authErrors';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

interface AuthState {
  profile: Profile | null;
  userEmail: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  loadProfile: (session?: Session | null) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  initAuthListener: () => () => void;
}

async function ensureProfile(session: Session): Promise<Profile | null> {
  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  if (existing) return existing;

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.warn('Profile fetch:', fetchError.message);
  }

  const fullName =
    (session.user.user_metadata?.full_name as string | undefined) ??
    session.user.email?.split('@')[0] ??
    'Cricket Fan';

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: session.user.id,
      full_name: fullName,
      phone: session.user.phone ?? null,
    })
    .select('*')
    .single();

  if (insertError) {
    console.warn('Profile create:', insertError.message);
    return null;
  }

  return created;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  userEmail: null,
  isLoading: true,
  isAuthenticated: false,

  initAuthListener: () => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          set({
            profile: null,
            userEmail: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
          await get().loadProfile(session);
        }
      }
    );

    return () => subscription.unsubscribe();
  },

  signInWithEmail: async (email, password) => {
    if (!isSupabaseConfigured()) {
      return {
        error: 'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) return { error: mapAuthError(error.message) };

      if (!data.session) {
        return {
          error: 'Sign in failed. Confirm your email in Supabase or disable "Confirm email" under Auth → Email.',
        };
      }

      await get().loadProfile(data.session);
      return { error: null };
    } catch (e) {
      return { error: (e as Error).message || 'Network error. Check your connection.' };
    }
  },

  signUpWithEmail: async (email, password, fullName) => {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase is not configured. Add keys to .env and restart the app.' };
    }

    const normalized = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });

    if (error) return { error: mapAuthError(error.message) };

    if (data.session) {
      await get().loadProfile(data.session);
      return { error: null };
    }

    return { error: null, needsConfirmation: true };
  },

  resetPassword: async (email) => {
    if (!isSupabaseConfigured()) {
      return { error: 'Supabase is not configured.' };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: 'cricketarena://reset-password' }
    );
    return { error: error?.message ? mapAuthError(error.message) : null };
  },

  loadProfile: async (sessionOverride) => {
    set({ isLoading: true });

    try {
      let session = sessionOverride ?? null;

      if (!session) {
        const { data: { session: stored } } = await supabase.auth.getSession();
        session = stored;
      }

      if (!session) {
        set({
          profile: null,
          userEmail: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      const profile = await ensureProfile(session);

      set({
        profile,
        userEmail: session.user.email ?? null,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (e) {
      console.warn('loadProfile error:', e);
      set({
        profile: null,
        userEmail: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      profile: null,
      userEmail: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  updateProfile: async (updates) => {
    const { profile } = get();
    if (!profile) return;
    const { data } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single();
    if (data) set({ profile: data });
  },
}));
