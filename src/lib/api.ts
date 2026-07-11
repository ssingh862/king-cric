import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.length > 0 && !fromEnv.includes('your-api')) {
    return fromEnv.replace(/\/$/, '').replace(/\/health$/, '');
  }
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (fromExtra && fromExtra.length > 0) {
    return fromExtra.replace(/\/$/, '').replace(/\/health$/, '');
  }
  return 'http://localhost:3000';
}

export const API_URL = resolveApiUrl();
const TOKEN_KEY = 'auth_token';

export function isApiConfigured(): boolean {
  const url = resolveApiUrl();
  return url.length > 0 && !url.includes('your-api') && url !== 'http://localhost:3000';
}

/** Verify the URL points to KingCric API (not Expo Metro by mistake). */
export async function checkApiHealth(): Promise<{ ok: boolean; message: string }> {
  if (!isApiConfigured()) {
    return { ok: false, message: 'EXPO_PUBLIC_API_URL is not set in .env' };
  }
  try {
    const res = await fetch(`${API_URL}/health`);
    const body = (await res.json()) as { ok?: boolean; service?: string; db?: string };
    if (body.service === 'king-cric-api') {
      if (body.ok) return { ok: true, message: 'API connected' };
      return { ok: false, message: 'API is up but MongoDB is not connected. Set MONGODB_URI on Railway.' };
    }
    return {
      ok: false,
      message:
        'Wrong backend — Railway is running Expo, not the API. Set Root Directory to server/ and redeploy.',
    };
  } catch {
    return { ok: false, message: `Cannot reach API at ${API_URL}` };
  }
}

/** @deprecated use isApiConfigured */
export const isSupabaseConfigured = isApiConfigured;

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string | null): Promise<void> {
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (options.auth !== false) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError((body as { error?: string }).error ?? res.statusText, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiSafe<T>(
  path: string,
  options?: RequestInit & { auth?: boolean }
): Promise<{ data: T | null; error: string | null }> {
  try {
    const data = await api<T>(path, options);
    return { data, error: null };
  } catch (e) {
    return { data: null, error: (e as Error).message };
  }
}
