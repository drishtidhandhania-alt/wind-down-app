import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, CircleCheck, LoaderCircle, Moon } from 'lucide-react';
import { useSaveWindDownPauseChoice } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetWindDownTesterQueryKey } from '@workspace/api-client-react';
import { testerRequest } from '@/lib/tester-api';
import { useCurrentUser } from '@/lib/auth-api';

export default function PausePage() {
  const [, setLocation] = useLocation();
  const auth = useCurrentUser();
  const [launchFallback, setLaunchFallback] = useState(false);
  const [message, setMessage] = useState('');
  const choice = useSaveWindDownPauseChoice({ request: testerRequest(auth.data?.id) });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!launchFallback) return;
    const timer = window.setTimeout(() => setMessage('If Instagram didn’t open, use the link below. Safari reopening behavior needs real-device verification.'), 1100);
    return () => window.clearTimeout(timer);
  }, [launchFallback]);

  const decide = (selected: 'start_wind_down' | 'continue_to_instagram') => {
    setMessage('');
    setLaunchFallback(false);
    choice.mutate({ data: { choice: selected } }, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getGetWindDownTesterQueryKey() });
        if (selected === 'start_wind_down') {
          setLocation('/routine');
          return;
        }
        setLaunchFallback(true);
        window.location.assign('instagram://app');
      },
    });
  };

  return (
    <div className="page-enter mx-auto max-w-2xl">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] no-underline hover:text-[hsl(var(--foreground))]" data-testid="link-back-home"><ArrowLeft size={15} /> Tonight</Link>
      <section className="overflow-hidden rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] px-6 py-8 text-center sm:px-12 sm:py-10">
        <div className="mx-auto mb-6 grid size-30 place-items-center rounded-full border border-[hsl(var(--accent)/.28)] bg-[hsl(var(--accent)/.07)] sm:size-36">
          <div className="breath-orb grid size-22 place-items-center rounded-full border border-[hsl(var(--accent)/.38)] bg-[hsl(var(--accent)/.12)] text-[hsl(var(--accent))] sm:size-28"><Moon size={27} strokeWidth={1.4} /></div>
        </div>
        <p className="font-mono text-xs font-medium text-[hsl(var(--accent))]">Take one unhurried breath</p>
        <h1 className="font-display mx-auto mt-3 max-w-xl text-4xl leading-[1.15] tracking-[-.025em]">What are you here for?</h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-[1.6] text-[hsl(var(--muted-foreground))]">No wrong answer. Let the first thought arrive before your thumb decides.</p>
        <div className="mx-auto mt-7 max-w-md space-y-3">
          <button onClick={() => decide('start_wind_down')} disabled={choice.isPending || launchFallback} className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-3 text-base font-semibold text-[hsl(var(--primary-foreground))] transition-colors hover:brightness-105 disabled:opacity-55 sm:gap-3 sm:px-6" data-testid="button-start-wind-down">
            {choice.isPending && choice.variables?.data.choice === 'start_wind_down' ? <LoaderCircle size={19} className="animate-spin" /> : <CircleCheck size={19} />}
            Start my wind-down <ArrowRight size={17} />
          </button>
          <button onClick={() => decide('continue_to_instagram')} disabled={choice.isPending || launchFallback} className="min-h-[58px] w-full rounded-full border border-[hsl(var(--card-border)/.58)] px-6 text-base font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--secondary))] disabled:opacity-55" data-testid="button-continue-instagram">
            {choice.isPending && choice.variables?.data.choice === 'continue_to_instagram' ? 'Saving your choice…' : 'Continue to Instagram'}
          </button>
        </div>
        {choice.isError && <p className="mt-4 text-sm text-[hsl(var(--destructive))]" role="alert">Your choice didn’t save. Nothing has opened; please try again.</p>}
        {launchFallback && (
          <div className="mt-6 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.45)] p-5 text-left">
            {message && <p className="text-sm leading-6 text-[hsl(var(--muted-foreground))]" role="status">{message}</p>}
            <a href="instagram://app" className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-full border border-[hsl(var(--border))] px-5 text-sm font-semibold text-[hsl(var(--primary))] no-underline" data-testid="link-open-instagram">Open Instagram <ArrowRight size={15} /></a>
            <p className="mt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">The choice was saved before we tried to open Instagram. Safari reopening behavior needs real-device verification.</p>
          </div>
        )}
      </section>
      <p className="mt-5 text-center text-xs text-[hsl(var(--muted-foreground))]">You can change your mind at any point. This is a pause, not a rule.</p>
    </div>
  );
}
