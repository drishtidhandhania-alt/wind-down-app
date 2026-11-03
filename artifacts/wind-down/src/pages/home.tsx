import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, Check, Clock3, LoaderCircle, Moon, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useGetWindDownTester, getGetWindDownTesterQueryKey, useUpdateWindDownSettings, useCheckWindDown } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeading, QuietLink } from '@/components/shell';
import { hasTesterToken, testerRequest } from '@/lib/tester-api';
import { useCurrentUser } from '@/lib/auth-api';
import type { TesterState } from '@workspace/api-client-react';

const fallback: TesterState = {
  bedtime: '22:30',
  morningEnd: '07:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  testMode: false,
  windowActive: false,
  bypassExpiresAt: null,
};

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] ${className}`}>{children}</section>;
}

export default function HomePage() {
  const [, setLocation] = useLocation();
  const auth = useCurrentUser();
  const [tokenReady, setTokenReady] = useState(false);
  const [bedtime, setBedtime] = useState(fallback.bedtime);
  const [morningEnd, setMorningEnd] = useState(fallback.morningEnd);
  const [timezone, setTimezone] = useState(fallback.timezone);
  const [testMode, setTestMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();
  useEffect(() => {
    setTokenReady(Boolean(auth.data && hasTesterToken(auth.data.id)));
  }, [auth.data?.id]);
  const tester = useGetWindDownTester({
    request: testerRequest(auth.data?.id),
    query: { enabled: tokenReady && Boolean(auth.data), queryKey: getGetWindDownTesterQueryKey(), retry: false },
  });
  const settingsMutation = useUpdateWindDownSettings({ request: testerRequest(auth.data?.id) });
  const checkMutation = useCheckWindDown({ request: testerRequest(auth.data?.id) });
  const state = tester.data ?? fallback;

  useEffect(() => {
    if (!tester.data) return;
    setBedtime(tester.data.bedtime);
    setMorningEnd(tester.data.morningEnd);
    setTimezone(tester.data.timezone);
    setTestMode(tester.data.testMode);
  }, [tester.data]);

  const save = () => {
    setSaved(false);
    settingsMutation.mutate({ data: { bedtime, morningEnd, timezone, testMode } }, {
      onSuccess: (next) => {
        queryClient.setQueryData(getGetWindDownTesterQueryKey(), next);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2600);
      },
    });
  };

  const checkNow = () => {
    checkMutation.mutate(undefined, {
      onSuccess: (decision) => {
        if (decision.decision === 'pause' && decision.pauseUrl) {
          setLocation(decision.pauseUrl.startsWith('/') ? decision.pauseUrl : '/pause');
        } else if (decision.decision === 'pause') {
          setLocation('/pause');
        }
      },
    });
  };

  if (auth.isLoading) {
    return <div className="page-enter py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">Checking your account…</div>;
  }

  if (!auth.data) {
    return (
      <div className="page-enter">
        <section className="relative overflow-hidden rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] px-6 py-9 sm:px-12 sm:py-12">
          <div className="absolute -right-20 -top-16 size-64 rounded-full border border-[hsl(var(--accent)/.12)]" />
          <div className="relative max-w-2xl">
            <p className="mb-4 font-mono text-xs font-medium text-[hsl(var(--accent))]">A gentler end to the day</p>
            <h1 className="font-display max-w-xl text-5xl leading-[1.15] tracking-[-.025em]">Make room for <span className="text-[hsl(var(--accent))]">sleep.</span></h1>
            <p className="mt-5 max-w-lg text-base leading-[1.6] text-[hsl(var(--muted-foreground))]">A private pause between you and one more scroll. Set a bedtime window, take a breath, then choose what you need.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/signup" className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[hsl(var(--primary))] px-6 font-semibold text-[hsl(var(--primary-foreground))] no-underline" data-testid="link-create-account">Create account <ArrowRight size={17} /></Link>
              <Link href="/login" className="inline-flex min-h-14 items-center justify-center rounded-full border border-[hsl(var(--card-border)/.66)] px-6 font-medium text-[hsl(var(--foreground))] no-underline hover:bg-[hsl(var(--secondary))]" data-testid="link-log-in">Log in</Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs text-[hsl(var(--muted-foreground))]">
              <span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-[hsl(var(--primary))]" /> One person. One device.</span>
              <span className="inline-flex items-center gap-2"><Clock3 size={15} className="text-[hsl(var(--accent))]" /> No streaks or pressure.</span>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!tokenReady) {
    return (
      <div className="page-enter">
        <section className="relative overflow-hidden rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] px-6 py-9 sm:px-12 sm:py-12">
          <div className="absolute -right-20 -top-16 size-64 rounded-full border border-[hsl(var(--accent)/.12)]" />
          <div className="relative max-w-2xl">
            <p className="mb-4 font-mono text-xs font-medium text-[hsl(var(--accent))]">A gentler end to the day</p>
            <h1 className="font-display max-w-xl text-5xl leading-[1.15] tracking-[-.025em]">Make room for <span className="text-[hsl(var(--accent))]">sleep.</span></h1>
            <p className="mt-5 max-w-lg text-base leading-[1.6] text-[hsl(var(--muted-foreground))]">A private pause between you and one more scroll. Set a bedtime window, take a breath, then choose what you need.</p>
            <Link href="/setup" className="mt-7 inline-flex min-h-14 whitespace-nowrap items-center justify-center gap-3 rounded-full bg-[hsl(var(--primary))] px-4 font-semibold text-[hsl(var(--primary-foreground))] no-underline transition-colors hover:brightness-105 sm:px-7" data-testid="link-begin-setup">
              Set up your private space <ArrowRight size={17} />
            </Link>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs text-[hsl(var(--muted-foreground))]">
              <span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-[hsl(var(--primary))]" /> One person. One device.</span>
              <span className="inline-flex items-center gap-2"><Clock3 size={15} className="text-[hsl(var(--accent))]" /> No streaks or pressure.</span>
            </div>
          </div>
        </section>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[hsl(var(--card-border)/.55)] px-5 py-4 text-sm text-[hsl(var(--muted-foreground))]">
          <span>Already have a private token?</span><QuietLink href="/setup">Restore it</QuietLink>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Your evening, gently"
        title={state.windowActive ? 'The night is yours.' : 'A softer landing.'}
        description={state.windowActive ? 'Your wind-down window is open. Take a breath before deciding what comes next.' : 'A little space between the scroll and the pillow.'}
        action={<div className="flex items-center gap-2 self-start rounded-full border border-[hsl(var(--card-border)/.55)] bg-[hsl(var(--card))] px-4 py-2.5 text-sm text-[hsl(var(--muted-foreground))] sm:self-auto"><span className={`size-2 rounded-full ${state.windowActive ? 'bg-[hsl(var(--success))]' : 'bg-[hsl(var(--muted-foreground)/.65)]'}`} />{state.windowActive ? 'Wind-down is on' : 'Window is resting'}</div>}
      />
      {tester.isLoading ? (
        <Panel className="animate-pulse p-7"><div className="h-5 w-1/3 rounded bg-[hsl(var(--secondary))]" /><div className="mt-5 h-16 rounded bg-[hsl(var(--secondary))]" /></Panel>
      ) : tester.isError ? (
        <Panel className="p-7">
          <p className="font-display text-2xl">We couldn’t reach your settings.</p>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Check your connection or restore your private token in setup.</p>
          <button onClick={() => tester.refetch()} className="mt-5 rounded-full border border-[hsl(var(--border))] px-5 py-3 text-sm hover:bg-[hsl(var(--secondary))]" data-testid="button-retry-settings">Try again</button>
        </Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-5 sm:px-8">
              <div className="flex items-center gap-2 text-sm font-medium"><Clock3 size={16} className="text-[hsl(var(--primary))]" /> Tonight’s window</div>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{timezone}</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-[hsl(var(--border))]">
              <div className="px-6 py-7 sm:px-8 sm:py-8"><p className="font-mono text-xs text-[hsl(var(--muted-foreground))]">Wind down at</p><p className="font-display mt-3 text-3xl sm:text-4xl">{formatTime(bedtime)}</p></div>
              <div className="px-6 py-7 sm:px-8 sm:py-8"><p className="font-mono text-xs text-[hsl(var(--muted-foreground))]">Window ends</p><p className="font-display mt-3 text-3xl sm:text-4xl">{formatTime(morningEnd)}</p></div>
            </div>
            <div className="border-t border-[hsl(var(--border))] px-6 py-5 sm:px-8">
              <label className="flex cursor-pointer items-start justify-between gap-4" htmlFor="test-mode">
                <span><span className="block text-sm font-medium">Test mode</span><span className="mt-1 block max-w-sm text-xs leading-5 text-[hsl(var(--muted-foreground))]">When on, every check pauses immediately, whatever the time.</span></span>
                <span className="relative mt-0.5 shrink-0">
                  <input id="test-mode" type="checkbox" checked={testMode} onChange={(event) => setTestMode(event.target.checked)} className="peer sr-only" data-testid="input-test-mode" />
                  <span className="block h-7 w-12 rounded-full bg-[hsl(var(--secondary))] transition-colors peer-checked:bg-[hsl(var(--primary))]" />
                  <span className="absolute left-1 top-1 size-5 rounded-full bg-[hsl(var(--foreground))] transition-transform peer-checked:translate-x-5 peer-checked:bg-[hsl(var(--primary-foreground))]" />
                </span>
              </label>
            </div>
          </Panel>
          <Panel className="flex flex-col justify-between p-6 sm:p-8">
            <div>
              <div className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-[hsl(var(--accent)/.12)] text-[hsl(var(--accent))]"><Moon size={20} /></div>
              <p className="font-mono text-xs text-[hsl(var(--muted-foreground))]">Your next small step</p>
              <h2 className="font-display mt-3 text-3xl leading-tight tracking-[-.03em]">Pause before the feed.</h2>
              <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Notice what you came for. Choose rest, or take a brief, intentional pass.</p>
            </div>
            <button onClick={checkNow} disabled={checkMutation.isPending} className="mt-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 text-base font-semibold text-[hsl(var(--primary-foreground))] transition-colors hover:brightness-105 disabled:opacity-60" data-testid="button-check-wind-down">
              {checkMutation.isPending ? <LoaderCircle size={18} className="animate-spin" /> : null}
              {checkMutation.isPending ? 'Checking…' : 'Check my wind-down'}
            </button>
            {checkMutation.isError && <p className="mt-3 text-sm text-[hsl(var(--destructive))]" role="alert">That didn’t go through. Try again in a moment.</p>}
            {checkMutation.isSuccess && checkMutation.data.decision === 'allow' && <p className="mt-3 text-sm text-[hsl(var(--primary))]" role="status">You’re outside the wind-down pause. Instagram can open.</p>}
            {checkMutation.isSuccess && checkMutation.data.decision === 'pause' && <p className="mt-3 text-sm text-[hsl(var(--primary))]" role="status">Your pause is ready. <Link href="/pause" className="underline underline-offset-4">Continue here</Link></p>}
          </Panel>
          {state.bypassExpiresAt && (
            <Panel className="flex items-center gap-4 border-[hsl(var(--accent)/.28)] bg-[hsl(var(--accent)/.06)] px-6 py-4 lg:col-span-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[hsl(var(--accent)/.12)] text-[hsl(var(--accent))]"><Clock3 size={16} /></span>
              <p className="text-sm leading-6 text-[hsl(var(--foreground))]">Your brief pass is open until <strong className="font-semibold">{new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(state.bypassExpiresAt))}</strong>. After that, your wind-down pause returns.</p>
            </Panel>
          )}
          <Panel className="p-6 sm:col-span-2 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:px-8">
            <div className="flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--accent))]"><SlidersHorizontal size={17} /></span>
              <div><h2 className="font-medium">Make it fit your evening</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Bedtime, morning, and timezone settings live in one quiet place.</p></div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:mt-0 sm:w-auto sm:min-w-[17rem]">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-[hsl(var(--muted-foreground))]">Bedtime<input type="time" value={bedtime} onChange={(event) => setBedtime(event.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.65)] px-3 text-sm text-[hsl(var(--foreground))]" data-testid="input-bedtime" /></label>
                <label className="text-xs text-[hsl(var(--muted-foreground))]">Morning end<input type="time" value={morningEnd} onChange={(event) => setMorningEnd(event.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.65)] px-3 text-sm text-[hsl(var(--foreground))]" data-testid="input-morning-end" /></label>
              </div>
              <label className="text-xs text-[hsl(var(--muted-foreground))]">Timezone<input value={timezone} onChange={(event) => setTimezone(event.target.value)} className="mt-2 block min-h-11 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.65)] px-3 text-sm text-[hsl(var(--foreground))]" data-testid="input-timezone" /></label>
              <button onClick={save} disabled={settingsMutation.isPending} className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-[hsl(var(--border))] px-4 text-sm font-semibold hover:bg-[hsl(var(--secondary))] disabled:opacity-50" data-testid="button-save-settings">
                {settingsMutation.isPending ? 'Saving…' : saved ? <><Check size={15} /> Saved</> : 'Save settings'}
              </button>
              {settingsMutation.isError && <p className="text-xs text-[hsl(var(--destructive))]" role="alert">Settings didn’t save. Please try again.</p>}
            </div>
          </Panel>
          <div className="flex items-center justify-between px-1 text-sm text-[hsl(var(--muted-foreground))] sm:col-span-2">
            <span className="inline-flex items-center gap-2"><Check size={15} className="text-[hsl(var(--primary))]" /> No score to keep. No perfect night required.</span>
            <Link href="/setup" className="hidden text-[hsl(var(--muted-foreground))] underline decoration-[hsl(var(--border))] underline-offset-4 hover:text-[hsl(var(--foreground))] sm:inline" data-testid="link-setup-settings">Private setup</Link>
          </div>
        </div>
      )}
    </div>
  );
}
