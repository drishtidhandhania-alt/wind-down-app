import { useEffect, useMemo, useState } from 'react';
import { Check, Clipboard, KeyRound, LoaderCircle, LockKeyhole, RotateCcw, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetWindDownTesterQueryKey, useCreateWindDownTester, useGetWindDownTester } from '@workspace/api-client-react';
import { PageHeading } from '@/components/shell';
import { getTesterToken, hasTesterToken, removeTesterToken, storeTesterToken, testerRequest } from '@/lib/tester-api';
import { useCurrentUser } from '@/lib/auth-api';

export default function SetupPage() {
  const auth = useCurrentUser();
  const userId = auth.data?.id;
  const [tokenInput, setTokenInput] = useState('');
  const [token, setToken] = useState('');
  const [tokenReady, setTokenReady] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState('');
  const queryClient = useQueryClient();
  useEffect(() => {
    const saved = getTesterToken(userId) || '';
    setToken(saved);
    setTokenInput(saved);
    setTokenReady(Boolean(saved));
  }, [userId]);

  const tester = useGetWindDownTester({
    request: testerRequest(userId),
    query: { enabled: tokenReady, queryKey: getGetWindDownTesterQueryKey(), retry: false },
  });
  const createTester = useCreateWindDownTester();
  const requestUrl = useMemo(() => {
    return `${window.location.origin}/api/wind-down/check`;
  }, []);

  const create = () => {
    setRestoreMessage('');
    createTester.mutate({ data: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' } }, {
      onSuccess: (created) => {
        storeTesterToken(userId, created.token);
        setToken(created.token);
        setTokenInput(created.token);
        setTokenReady(true);
        queryClient.setQueryData(getGetWindDownTesterQueryKey(), {
          bedtime: created.bedtime,
          morningEnd: created.morningEnd,
          timezone: created.timezone,
          testMode: created.testMode,
          windowActive: created.windowActive,
          bypassExpiresAt: created.bypassExpiresAt,
        });
        setRevealed(false);
      },
    });
  };

  const restore = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = tokenInput.trim();
    if (!clean) return;
    storeTesterToken(userId, clean);
    setToken(clean);
    setTokenReady(true);
    setRestoreMessage('Checking this private token…');
    queryClient.removeQueries({ queryKey: getGetWindDownTesterQueryKey() });
    window.setTimeout(() => queryClient.invalidateQueries({ queryKey: getGetWindDownTesterQueryKey() }), 0);
  };

  useEffect(() => {
    if (tester.isSuccess && tokenReady) setRestoreMessage('Your private space is connected on this device.');
    if (tester.isError && tokenReady) setRestoreMessage('We couldn’t verify that token. Check it and try again.');
  }, [tester.isSuccess, tester.isError, tokenReady]);

  const copyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setRevealed(true);
      setCopied(false);
    }
  };

  const hasToken = Boolean(token);

  return (
    <div className="page-enter">
      <PageHeading eyebrow="Private by design" title="Your phone, your pause." description="This space belongs to you. A private tester token connects your iPhone Shortcut to your bedtime window." />
      <div className="grid gap-5 lg:grid-cols-[.92fr_1.08fr]">
        <section className="rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><KeyRound size={19} /></span>
            <div><h2 className="font-display text-2xl tracking-[-.025em]">Private tester token</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">It stays in this browser’s local storage. Keep it private; your Shortcut uses it to make requests for you.</p></div>
          </div>
          {hasToken ? (
            <div className="mt-7">
              <label htmlFor="active-token" className="font-mono text-xs font-medium text-[hsl(var(--muted-foreground))]">Token for your Shortcut</label>
              <div className="mt-2 flex gap-2">
                <input id="active-token" readOnly value={revealed ? token : '•'.repeat(Math.min(token.length, 32))} className="min-h-12 min-w-0 flex-1 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.7)] px-4 font-mono text-xs text-[hsl(var(--foreground))]" data-testid="input-active-token" />
                <button onClick={() => setRevealed((value) => !value)} className="min-h-12 rounded-xl border border-[hsl(var(--border))] px-3 text-xs font-medium hover:bg-[hsl(var(--secondary))]" data-testid="button-reveal-token">{revealed ? 'Hide' : 'Reveal'}</button>
                <button onClick={copyToken} className="grid min-h-12 min-w-12 place-items-center rounded-xl border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))]" aria-label="Copy private token" data-testid="button-copy-token">{copied ? <Check size={17} /> : <Clipboard size={17} />}</button>
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs text-[hsl(var(--primary))]" role="status"><ShieldCheck size={14} />{tester.isLoading ? 'Checking your connection…' : tester.isError ? 'Token not verified yet.' : 'Connected on this device.'}</p>
              {tester.isError && <button onClick={() => tester.refetch()} className="mt-3 rounded-full border border-[hsl(var(--border))] px-4 py-2 text-xs font-medium hover:bg-[hsl(var(--secondary))]" data-testid="button-retry-token">Retry token check</button>}
              <button onClick={() => { removeTesterToken(userId); setToken(''); setTokenInput(''); setTokenReady(false); setRestoreMessage('This device no longer has a saved token.'); queryClient.removeQueries({ queryKey: getGetWindDownTesterQueryKey() }); }} className="mt-5 inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] underline decoration-[hsl(var(--border))] underline-offset-4 hover:text-[hsl(var(--foreground))]" data-testid="button-remove-token"><RotateCcw size={14} /> Remove token from this device</button>
            </div>
          ) : (
            <>
              <button onClick={create} disabled={createTester.isPending} className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-3 font-semibold text-[hsl(var(--primary-foreground))] disabled:opacity-60 sm:px-5" data-testid="button-create-token">
                {createTester.isPending ? <LoaderCircle size={18} className="animate-spin" /> : <LockKeyhole size={17} />}
                {createTester.isPending ? 'Making your private space…' : 'Create a private tester'}
              </button>
              {createTester.isError && <p className="mt-3 text-sm text-[hsl(var(--destructive))]" role="alert">We couldn’t create the token. Please try again.</p>}
              <div className="my-6 flex items-center gap-3 font-mono text-xs text-[hsl(var(--muted-foreground))]"><span className="h-px flex-1 bg-[hsl(var(--border))]" />Or restore<span className="h-px flex-1 bg-[hsl(var(--border))]" /></div>
              <form onSubmit={restore} className="space-y-3">
                <label htmlFor="restore-token" className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Paste an existing private token</label>
                <input id="restore-token" type="password" autoComplete="off" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} placeholder="Your tester token" className="min-h-12 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.7)] px-4 text-sm" data-testid="input-restore-token" />
                <button type="submit" disabled={!tokenInput.trim()} className="min-h-12 w-full rounded-full border border-[hsl(var(--border))] font-medium hover:bg-[hsl(var(--secondary))] disabled:opacity-40" data-testid="button-restore-token">Restore on this device</button>
                {restoreMessage && <p role="status" className="text-sm text-[hsl(var(--muted-foreground))]">{restoreMessage}</p>}
              </form>
            </>
          )}
          {hasToken && restoreMessage && <p className="mt-3 text-xs text-[hsl(var(--muted-foreground))]" role="status">{restoreMessage}</p>}
        </section>

        <section className="rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--accent)/.1)] text-[hsl(var(--accent))]"><span className="font-display text-lg">i</span></span>
            <div><h2 className="font-display text-2xl tracking-[-.025em]">Set up on iPhone</h2><p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Create one Shortcut, then run it from an Instagram Personal Automation.</p></div>
          </div>
          <div className="mt-7 space-y-6">
            <div className="border-l border-[hsl(var(--primary)/.38)] pl-5">
              <p className="font-mono text-xs font-medium text-[hsl(var(--accent))]">Shortcut · Check wind down</p>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                <li>1. In Shortcuts, tap <strong className="font-medium text-[hsl(var(--foreground))]">+</strong> and create a shortcut named <strong className="font-medium text-[hsl(var(--foreground))]">Check Wind Down</strong>.</li>
                <li>2. Add <strong className="font-medium text-[hsl(var(--foreground))]">Get Contents of URL</strong> and use this full address:</li>
              </ol>
              <code className="mt-2 block break-all whitespace-normal rounded-xl border border-[hsl(var(--card-border)/.55)] bg-[hsl(var(--background)/.8)] px-3 py-3 font-mono text-xs leading-5 text-[hsl(var(--accent))]" data-testid="text-shortcut-url">{requestUrl}</code>
              <ol start={3} className="mt-3 space-y-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                <li>3. Tap <strong className="font-medium text-[hsl(var(--foreground))]">Show More</strong>. Set method to <strong className="font-medium text-[hsl(var(--foreground))]">POST</strong>, request body to <strong className="font-medium text-[hsl(var(--foreground))]">None</strong>, then add this header:</li>
              </ol>
              <div className="mt-2 grid min-w-0 gap-2 rounded-xl border border-[hsl(var(--card-border)/.55)] bg-[hsl(var(--background)/.8)] p-3 font-mono text-xs leading-5 sm:grid-cols-2">
                <p><span className="text-[hsl(var(--muted-foreground))]">Key</span><br /><span className="text-[hsl(var(--accent))]">X-Tester-Token</span></p>
                <p><span className="text-[hsl(var(--muted-foreground))]">Value</span><br /><span className="text-[hsl(var(--primary))]">Paste your private token</span></p>
              </div>
              <ol start={4} className="mt-3 space-y-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                <li>4. Add <strong className="font-medium text-[hsl(var(--foreground))]">Get Dictionary Value</strong>. Set its key to <code className="text-[hsl(var(--accent))]">decision</code> (the input is the URL response).</li>
                <li>5. Add an <strong className="font-medium text-[hsl(var(--foreground))]">If</strong> action: if that value <strong className="font-medium text-[hsl(var(--foreground))]">is</strong> <code className="text-[hsl(var(--accent))]">pause</code>, get Dictionary Value <code className="text-[hsl(var(--accent))]">pauseUrl</code> from the URL response, then add <strong className="font-medium text-[hsl(var(--foreground))]">Open URLs</strong> with that value.</li>
                <li>6. Leave the Otherwise branch empty, then end the If. When the decision is <code className="text-[hsl(var(--accent))]">allow</code>, the Shortcut does nothing.</li>
              </ol>
            </div>
            <div className="border-l border-[hsl(var(--accent)/.42)] pl-5">
              <p className="font-mono text-xs font-medium text-[hsl(var(--accent))]">Personal Automation · Instagram</p>
              <ol className="mt-3 space-y-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                <li>1. In Shortcuts, open <strong className="font-medium text-[hsl(var(--foreground))]">Automation</strong>, tap <strong className="font-medium text-[hsl(var(--foreground))]">+</strong>, then create a Personal Automation.</li>
                <li>2. Choose <strong className="font-medium text-[hsl(var(--foreground))]">App</strong>, select Instagram, and choose <strong className="font-medium text-[hsl(var(--foreground))]">Is Opened</strong>.</li>
                <li>3. Choose <strong className="font-medium text-[hsl(var(--foreground))]">Run Immediately</strong>, then add <strong className="font-medium text-[hsl(var(--foreground))]">Run Shortcut → Check Wind Down</strong>.</li>
                <li>4. Instagram has already opened when this automation starts. If the server cannot be reached, the Shortcut stops before opening the pause page, so you can continue in Instagram.</li>
              </ol>
            </div>
          </div>
          <p className="mt-7 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.48)] px-4 py-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Apple’s Shortcuts interface may change between iOS releases. The automation runs on your iPhone; this website does not monitor your apps. Use the full address shown above on the same iPhone where you opened this page.</p>
        </section>
      </div>
    </div>
  );
}
