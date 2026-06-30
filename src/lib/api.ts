import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const TOKEN_KEY = 'auth_token';

export function isApiConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_API_URL ?? '';
  return Boolean(url && url.length > 0 && !url.includes('your-api'));
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
