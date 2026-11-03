export const TESTER_TOKEN_KEY = 'wind-down-tester-token';
const ACTIVE_USER_KEY = 'wind-down-active-user';
const LAST_USER_KEY = 'wind-down-last-user';
const LEGACY_TOKEN_OWNER_KEY = 'wind-down-legacy-token-owner';

function scopedTokenKey(userId: string) {
  return `${TESTER_TOKEN_KEY}:${userId}`;
}

export function activateTesterScope(userId: string) {
  if (typeof window === 'undefined') return;

  const legacyToken = window.localStorage.getItem(TESTER_TOKEN_KEY);
  const previousOwner = window.localStorage.getItem(LEGACY_TOKEN_OWNER_KEY);
  if (legacyToken && (!previousOwner || previousOwner === userId)) {
    const scopedKey = scopedTokenKey(userId);
    if (!window.localStorage.getItem(scopedKey)) {
      window.localStorage.setItem(scopedKey, legacyToken);
    }
    window.localStorage.removeItem(TESTER_TOKEN_KEY);
    window.localStorage.setItem(LEGACY_TOKEN_OWNER_KEY, userId);
  }

  window.localStorage.setItem(ACTIVE_USER_KEY, userId);
  window.localStorage.setItem(LAST_USER_KEY, userId);
}

export function clearActiveTesterScope() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ACTIVE_USER_KEY);
  }
}

export function getTesterToken(userId?: string | null) {
  if (typeof window === 'undefined') return null;
  const activeUserId =
    userId ||
    window.localStorage.getItem(ACTIVE_USER_KEY) ||
    window.localStorage.getItem(LAST_USER_KEY) ||
    undefined;
  if (activeUserId) {
    const scopedToken = window.localStorage.getItem(
      scopedTokenKey(activeUserId),
    );
    if (scopedToken) return scopedToken;
  }

  const legacyOwner = window.localStorage.getItem(LEGACY_TOKEN_OWNER_KEY);
  if (activeUserId && legacyOwner && legacyOwner !== activeUserId) return null;
  return window.localStorage.getItem(TESTER_TOKEN_KEY);
}

export function storeTesterToken(userId: string | undefined, token: string) {
  if (typeof window === 'undefined') return;
  if (userId) {
    activateTesterScope(userId);
    window.localStorage.setItem(scopedTokenKey(userId), token);
    return;
  }
  window.localStorage.setItem(TESTER_TOKEN_KEY, token);
}

export function removeTesterToken(userId?: string) {
  if (typeof window === 'undefined') return;
  if (userId) {
    window.localStorage.removeItem(scopedTokenKey(userId));
  } else {
    window.localStorage.removeItem(TESTER_TOKEN_KEY);
  }
}

export function testerRequest(userId?: string | null) {
  const token = getTesterToken(userId);
  return token ? { headers: { 'X-Tester-Token': token } } : {};
}

export function hasTesterToken(userId?: string | null) {
  return Boolean(getTesterToken(userId));
}
