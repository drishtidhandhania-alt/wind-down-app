import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, ArrowRight, Check, LoaderCircle, Moon, Smartphone, Droplets, BookOpen } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getListWindDownSessionsQueryKey, useCompleteWindDownRoutine, RoutineCompleteInputCompletedStepsItem } from '@workspace/api-client-react';
import { testerRequest } from '@/lib/tester-api';
import { useCurrentUser } from '@/lib/auth-api';

const steps: { id: RoutineCompleteInputCompletedStepsItem; title: string; detail: string; icon: typeof Smartphone }[] = [
  { id: 'phone_on_charger', title: 'Phone on its charger', detail: 'Let it rest somewhere out of reach.', icon: Smartphone },
  { id: 'brush_teeth', title: 'Brush your teeth', detail: 'A small signal that the day is closing.', icon: Droplets },
  { id: 'read_five_minutes', title: 'Read for five minutes', detail: 'A few pages, at whatever pace.', icon: BookOpen },
];

const ROUTINE_PROGRESS_KEY = 'wind-down-routine-progress';

type RoutineProgress = {
  checked: RoutineCompleteInputCompletedStepsItem[];
  routineStartedAt: string;
};

function readRoutineProgress(): RoutineProgress {
  const fallback = { checked: [], routineStartedAt: new Date().toISOString() };

  try {
    const saved = window.sessionStorage.getItem(ROUTINE_PROGRESS_KEY);
    if (!saved) return fallback;

    const parsed = JSON.parse(saved) as {
      checked?: unknown;
      routineStartedAt?: unknown;
    };
    const checked = Array.isArray(parsed.checked)
      ? parsed.checked.filter(
          (id): id is RoutineCompleteInputCompletedStepsItem =>
            steps.some((step) => step.id === id),
        )
      : [];
    const startedAt =
      typeof parsed.routineStartedAt === 'string' &&
      Number.isFinite(Date.parse(parsed.routineStartedAt)) &&
      Date.parse(parsed.routineStartedAt) <= Date.now()
        ? parsed.routineStartedAt
        : fallback.routineStartedAt;

    return { checked: [...new Set(checked)], routineStartedAt: startedAt };
  } catch {
    return fallback;
  }
}

export default function RoutinePage() {
  const [, setLocation] = useLocation();
  const auth = useCurrentUser();
  const [progress, setProgress] = useState<RoutineProgress>(readRoutineProgress);
  const { checked, routineStartedAt } = progress;
  const [finished, setFinished] = useState(false);
  const completion = useCompleteWindDownRoutine({ request: testerRequest(auth.data?.id) });
  const queryClient = useQueryClient();

  useEffect(() => {
    try {
      window.sessionStorage.setItem(ROUTINE_PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // Keep the routine usable when browser storage is unavailable.
    }
  }, [progress]);

  const toggle = (id: RoutineCompleteInputCompletedStepsItem) => {
    setProgress((current) => ({
      ...current,
      checked: current.checked.includes(id)
        ? current.checked.filter((item) => item !== id)
        : [...current.checked, id],
    }));
  };
  const finish = () => {
    completion.mutate(
      { data: { completedSteps: checked, startedAt: routineStartedAt } },
      {
        onSuccess: async () => {
          try {
            window.sessionStorage.removeItem(ROUTINE_PROGRESS_KEY);
          } catch {
            // The successful save should still be shown if storage is unavailable.
          }
          await queryClient.invalidateQueries({ queryKey: getListWindDownSessionsQueryKey() });
          setFinished(true);
        },
      },
    );
  };

  return (
    <div className="page-enter routine-page mx-auto max-w-2xl">
      <Link href="/pause" className="mb-8 inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] no-underline hover:text-[hsl(var(--foreground))]" data-testid="link-back-pause"><ArrowLeft size={15} /> Back to pause</Link>
      {finished ? (
        <section className="rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] px-6 py-12 text-center sm:px-12 sm:py-16">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-[hsl(var(--success)/.12)] text-[hsl(var(--success))] check-pop"><Check size={26} /></div>
          <p className="mt-7 font-mono text-xs font-medium text-[hsl(var(--success))]">That’s enough for tonight</p>
          <h1 className="font-display mt-3 text-4xl tracking-[-.025em]">You showed up.</h1>
          <p className="mx-auto mt-4 max-w-sm text-base leading-7 text-[hsl(var(--muted-foreground))]">Your routine completion is saved to session history. Let the rest of the night be simple.</p>
          <Link href="/sessions" className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full border border-[hsl(var(--border))] px-6 text-sm font-medium text-inherit no-underline hover:bg-[hsl(var(--secondary))]" data-testid="link-routine-history">View session history</Link>
          <button onClick={() => setLocation('/')} className="mt-8 inline-flex min-h-14 items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-7 font-semibold text-[hsl(var(--primary-foreground))]" data-testid="button-finish-routine">Finish for tonight <ArrowRight size={17} /></button>
        </section>
      ) : (
        <>
          <div className="routine-intro mb-8 text-center">
            <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full border border-[hsl(var(--accent)/.3)] bg-[hsl(var(--accent)/.1)] text-[hsl(var(--accent))]"><Moon size={22} /></div>
            <p className="font-mono text-xs font-medium text-[hsl(var(--accent))]">Your wind-down</p>
            <h1 className="font-display mt-3 text-4xl tracking-[-.025em]">Three small things.</h1>
            <p className="mt-3 text-base leading-[1.6] text-[hsl(var(--muted-foreground))]">Check them off in your own time. Nothing here needs to be perfect.</p>
          </div>
          <div className="routine-steps space-y-3">
            {steps.map(({ id, title, detail, icon: Icon }, index) => {
              const isChecked = checked.includes(id);
              return (
                <button key={id} onClick={() => toggle(id)} aria-pressed={isChecked} className={`routine-step flex min-h-[88px] w-full items-center gap-4 rounded-2xl border px-5 text-left transition-colors duration-300 sm:px-6 ${isChecked ? 'border-[hsl(var(--success)/.48)] bg-[hsl(var(--success)/.08)]' : 'border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] hover:bg-[hsl(var(--secondary))]'}`} data-testid={`button-routine-step-${index + 1}`}>
                  <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${isChecked ? 'bg-[hsl(var(--success))] text-[hsl(var(--primary-foreground))] check-pop' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--accent))]'}`}>{isChecked ? <Check size={19} /> : <Icon size={19} />}</span>
                  <span className="min-w-0 flex-1"><span className={`block text-base font-medium ${isChecked ? 'text-[hsl(var(--success))]' : ''}`}>{title}</span><span className="mt-1 block text-sm text-[hsl(var(--muted-foreground))]">{detail}</span></span>
                  <span className="routine-step-index font-mono text-xs tabular-nums text-[hsl(var(--muted-foreground))]">{String(index + 1).padStart(2, '0')}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-6">
            <button onClick={finish} disabled={checked.length !== steps.length || completion.isPending} className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-6 text-base font-semibold text-[hsl(var(--primary-foreground))] transition-opacity disabled:cursor-not-allowed disabled:bg-[hsl(var(--secondary))] disabled:text-[hsl(var(--muted-foreground))] disabled:opacity-100" data-testid="button-complete-routine">
              {completion.isPending ? <LoaderCircle size={18} className="animate-spin" /> : null}
              {completion.isPending ? 'Saving your routine…' : 'Finish my wind-down'}
              {!completion.isPending && <ArrowRight size={17} />}
            </button>
            <p className="mt-3 text-center text-xs text-[hsl(var(--muted-foreground))]">{checked.length === steps.length ? 'Ready when you are.' : `${checked.length} of 3 complete — check each step before finishing.`}</p>
            {completion.isError && <p className="mt-3 text-center text-sm text-[hsl(var(--destructive))]" role="alert">Your routine didn’t save. Your steps are still here; try again.</p>}
          </div>
        </>
      )}
    </div>
  );
}
