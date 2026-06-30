import { create } from 'zustand';
import { mapAuthError } from '../lib/authErrors';
import { api, isApiConfigured, setToken } from '../lib/api';
import type { Profile } from '../types/database';

interface AuthResponse {
  token: string;
  user: Profile;
  email: string;
}

interface MeResponse {
  user: Profile;
  email: string;
}

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
  loadProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  initAuthListener: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  userEmail: null,
  isLoading: true,
  isAuthenticated: false,

  initAuthListener: () => {
    void get().loadProfile();
    return () => {};
  },

  signInWithEmail: async (email, password) => {
    if (!isApiConfigured()) {
      return {
        error: 'API is not configured. Add EXPO_PUBLIC_API_URL to .env',
      };
    }

    try {
      const data = await api<AuthResponse>('/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      await setToken(data.token);
      set({
        profile: data.user,
        userEmail: data.email,
        isAuthenticated: true,
        isLoading: false,
      });
      return { error: null };
    } catch (e) {
      return { error: mapAuthError((e as Error).message) };
    }
  },

  signUpWithEmail: async (email, password, fullName) => {
    if (!isApiConfigured()) {
      return { error: 'API is not configured. Add EXPO_PUBLIC_API_URL to .env and restart the app.' };
    }

    try {
      const data = await api<AuthResponse>('/auth/register', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          full_name: fullName.trim(),
        }),
      });

      await setToken(data.token);
      set({
        profile: data.user,
        userEmail: data.email,
        isAuthenticated: true,
        isLoading: false,
      });
      return { error: null };
    } catch (e) {
      return { error: mapAuthError((e as Error).message) };
    }
  },

  resetPassword: async (email) => {
    if (!isApiConfigured()) {
      return { error: 'API is not configured.' };
    }
    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      return { error: null };
    } catch (e) {
      return { error: mapAuthError((e as Error).message) };
    }
  },

  loadProfile: async () => {
    set({ isLoading: true });

    try {
      if (!isApiConfigured()) {
        set({
          profile: null,
          userEmail: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      const data = await api<MeResponse>('/auth/me');
      set({
        profile: data.user,
        userEmail: data.email,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      await setToken(null);
      set({
        profile: null,
        userEmail: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  signOut: async () => {
    await setToken(null);
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
    const data = await api<{ user: Profile }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (data.user) set({ profile: data.user });
  },
}));
