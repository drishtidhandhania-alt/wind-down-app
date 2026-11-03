import { useQuery } from '@tanstack/react-query';

export type AuthUser = {
  id: string;
  email: string;
};

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Unable to check your sign-in.');
  return response.json() as Promise<AuthUser>;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 60_000,
  });
}

export async function submitAuth(
  mode: 'login' | 'signup',
  email: string,
  password: string,
): Promise<AuthUser> {
  const response = await fetch(`/api/auth/${mode}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const result = (await response.json().catch(() => null)) as
    | { user?: AuthUser; error?: string }
    | null;
  if (!response.ok || !result?.user) {
    throw new Error(result?.error || 'Unable to sign in right now.');
  }
  return result.user;
}

export async function logoutRequest(): Promise<void> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error('Unable to sign out right now.');
}
