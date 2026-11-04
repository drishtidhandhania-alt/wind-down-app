import assert from 'node:assert/strict';
import test from 'node:test';
import { checkShortcutConnection, type ShortcutCheckFetcher } from './shortcut-check.ts';

const appOrigin = 'https://wind-down.example';
const privateToken = 'private-token-for-test-only';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('sends the Shortcut POST and returns only sanitized pause diagnostics', async () => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;
  const fetcher: ShortcutCheckFetcher = async (url, init) => {
    requestUrl = url;
    requestInit = init;
    return jsonResponse({
      decision: 'pause',
      reason: 'wind_down_window',
      pauseUrl: `${appOrigin}/pause`,
      bypassExpiresAt: null,
    });
  };

  const result = await checkShortcutConnection(
    privateToken,
    appOrigin,
    fetcher,
  );

  assert.equal(requestUrl, '/api/wind-down/check');
  assert.equal(requestInit?.method, 'POST');
  assert.equal(requestInit?.credentials, 'omit');
  assert.equal(requestInit?.body, undefined);
  assert.equal(
    new Headers(requestInit?.headers).get('X-Tester-Token'),
    privateToken,
  );
  assert.deepEqual(result, {
    status: 'decision',
    decision: 'pause',
    reason: 'wind_down_window',
    hasSafePauseLink: true,
  });
  assert.equal(JSON.stringify(result).includes(privateToken), false);
});

test('returns allow without a pause link when the window is inactive', async () => {
  const fetcher: ShortcutCheckFetcher = async () =>
    jsonResponse({
      decision: 'allow',
      reason: 'outside_window',
      pauseUrl: null,
      bypassExpiresAt: null,
    });

  assert.deepEqual(
    await checkShortcutConnection(privateToken, appOrigin, fetcher),
    {
      status: 'decision',
      decision: 'allow',
      reason: 'outside_window',
      hasSafePauseLink: false,
    },
  );
});

test('does not send a request when the private token is missing', async () => {
  let requestCount = 0;
  const fetcher: ShortcutCheckFetcher = async () => {
    requestCount += 1;
    return jsonResponse({});
  };

  assert.deepEqual(
    await checkShortcutConnection('  ', appOrigin, fetcher),
    { status: 'error', code: 'missing_token' },
  );
  assert.equal(requestCount, 0);
});

test('shows a safe local pause link only for a same-origin pause URL', async () => {
  const fetcher: ShortcutCheckFetcher = async () =>
    jsonResponse({
      decision: 'pause',
      reason: 'test_mode',
      pauseUrl: 'https://another.example/pause',
      bypassExpiresAt: null,
    });

  const result = await checkShortcutConnection(
    privateToken,
    appOrigin,
    fetcher,
  );

  assert.deepEqual(result, {
    status: 'decision',
    decision: 'pause',
    reason: 'test_mode',
    hasSafePauseLink: false,
  });
});

test('handles rejected tokens, server failures, invalid responses, and network errors without details', async (t) => {
  const cases: Array<{
    name: string;
    fetcher: ShortcutCheckFetcher;
    code: string;
  }> = [
    {
      name: 'rejected token',
      fetcher: async () => jsonResponse({ error: privateToken }, 401),
      code: 'token_rejected',
    },
    {
      name: 'server failure',
      fetcher: async () => jsonResponse({ error: privateToken }, 503),
      code: 'server_error',
    },
    {
      name: 'invalid response',
      fetcher: async () => new Response('not json', { status: 200 }),
      code: 'invalid_response',
    },
    {
      name: 'network failure',
      fetcher: async () => {
        throw new Error(`Network failure involving ${privateToken}`);
      },
      code: 'network_error',
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const result = await checkShortcutConnection(
        privateToken,
        appOrigin,
        scenario.fetcher,
      );
      assert.deepEqual(result, { status: 'error', code: scenario.code });
      assert.equal(JSON.stringify(result).includes(privateToken), false);
    });
  }
});
