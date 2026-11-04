export type ShortcutCheckDecision = 'allow' | 'pause';
export type ShortcutCheckReason =
  | 'outside_window'
  | 'test_mode'
  | 'active_bypass'
  | 'wind_down_window';

export type ShortcutCheckError =
  | 'missing_token'
  | 'token_rejected'
  | 'server_error'
  | 'network_error'
  | 'invalid_response';

export type ShortcutCheckResult =
  | {
      status: 'decision';
      decision: ShortcutCheckDecision;
      reason: ShortcutCheckReason;
      hasSafePauseLink: boolean;
    }
  | { status: 'error'; code: ShortcutCheckError };

export type ShortcutCheckFetcher = (
  input: string,
  init: RequestInit,
) => Promise<Response>;

const allowedDecisions: ShortcutCheckDecision[] = ['allow', 'pause'];
const allowedReasons: ShortcutCheckReason[] = [
  'outside_window',
  'test_mode',
  'active_bypass',
  'wind_down_window',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isShortcutDecision(value: unknown): value is ShortcutCheckDecision {
  return (
    typeof value === 'string' &&
    allowedDecisions.includes(value as ShortcutCheckDecision)
  );
}

function isShortcutReason(value: unknown): value is ShortcutCheckReason {
  return (
    typeof value === 'string' &&
    allowedReasons.includes(value as ShortcutCheckReason)
  );
}

function hasSafePausePage(pauseUrl: unknown, appOrigin: string): boolean {
  if (typeof pauseUrl !== 'string' || !pauseUrl.trim()) return false;

  try {
    const origin = new URL(appOrigin).origin;
    const url = new URL(pauseUrl, origin);
    return (
      url.origin === origin &&
      url.pathname === '/pause' &&
      (url.protocol === 'http:' || url.protocol === 'https:')
    );
  } catch {
    return false;
  }
}

export async function checkShortcutConnection(
  token: string | null | undefined,
  appOrigin: string,
  fetcher: ShortcutCheckFetcher = fetch,
): Promise<ShortcutCheckResult> {
  const privateToken = token?.trim();
  if (!privateToken) return { status: 'error', code: 'missing_token' };

  let response: Response;
  try {
    response = await fetcher('/api/wind-down/check', {
      method: 'POST',
      credentials: 'omit',
      headers: { 'X-Tester-Token': privateToken },
    });
  } catch {
    return { status: 'error', code: 'network_error' };
  }

  if (!response.ok) {
    return {
      status: 'error',
      code:
        response.status === 401 || response.status === 403
          ? 'token_rejected'
          : 'server_error',
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { status: 'error', code: 'invalid_response' };
  }

  if (
    !isRecord(body) ||
    !isShortcutDecision(body.decision) ||
    !isShortcutReason(body.reason) ||
    (body.pauseUrl !== null && typeof body.pauseUrl !== 'string')
  ) {
    return { status: 'error', code: 'invalid_response' };
  }

  return {
    status: 'decision',
    decision: body.decision,
    reason: body.reason,
    hasSafePauseLink:
      body.decision === 'pause' && hasSafePausePage(body.pauseUrl, appOrigin),
  };
}
