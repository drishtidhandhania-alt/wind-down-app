import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, LoaderCircle, Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'wouter';
import {
  getGetWindDownSessionQueryKey,
  getListWindDownSessionsQueryKey,
  useCreateWindDownSession,
  useGetWindDownSession,
  useUpdateWindDownSession,
  type WindDownSession,
} from '@workspace/api-client-react';
import { PageHeading } from '@/components/shell';
import { useCurrentUser } from '@/lib/auth-api';

type SessionDraft = {
  routineId: string;
  startedAt: string;
  endedAt: string;
  outcome: string;
  minutesDelayed: string;
  note: string;
};

type SessionFieldErrors = Partial<Record<'startedAt' | 'outcome', string>>;

function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function fromDateTimeLocal(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function createDraft(): SessionDraft {
  return {
    routineId: '',
    startedAt: toDateTimeLocal(new Date().toISOString()),
    endedAt: '',
    outcome: '',
    minutesDelayed: '',
    note: '',
  };
}

function draftFromSession(session: WindDownSession): SessionDraft {
  return {
    routineId: session.routineId ?? '',
    startedAt: toDateTimeLocal(session.startedAt),
    endedAt: toDateTimeLocal(session.endedAt),
    outcome: session.outcome ?? '',
    minutesDelayed: session.minutesDelayed === null ? '' : String(session.minutesDelayed),
    note: session.note ?? '',
  };
}

function InputField({
  label,
  children,
  hint,
  required = false,
  error,
  errorId,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  required?: boolean;
  error?: string;
  errorId?: string;
}) {
  return (
    <label className="block min-w-0 text-sm font-medium">
      <span>
        {label}
        {required && <span className="ml-1 text-xs font-normal text-[hsl(var(--muted-foreground))]">(required)</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs font-normal text-[hsl(var(--muted-foreground))]">{hint}</span>}
      {error && <span id={errorId} className="mt-1 block text-sm font-normal text-[hsl(var(--destructive))]" role="alert">{error}</span>}
    </label>
  );
}

const inputClass =
  'mt-2 block min-h-12 w-full min-w-0 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.6)] px-3 text-base text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]';

function SessionFields({
  draft,
  setDraft,
  submit,
  submitting,
  error,
  fieldErrors,
  clearFieldError,
  submitLabel,
  backHref,
}: {
  draft: SessionDraft;
  setDraft: (next: SessionDraft) => void;
  submit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  error: string;
  fieldErrors: SessionFieldErrors;
  clearFieldError: (field: keyof SessionFieldErrors) => void;
  submitLabel: string;
  backHref: string;
}) {
  const update = <K extends keyof SessionDraft>(key: K, value: SessionDraft[K]) => {
    setDraft({ ...draft, [key]: value });
  };

  return (
    <div className="page-enter mx-auto max-w-3xl">
      <Link href={backHref} className="mb-6 inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] no-underline hover:text-[hsl(var(--foreground))]">
        <ArrowLeft size={15} />
        {backHref === '/sessions' ? 'Session history' : 'Back to session'}
      </Link>
      <section className="rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] p-5 sm:p-8">
        <form noValidate onSubmit={submit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <InputField label="Started at" required error={fieldErrors.startedAt} errorId="session-started-at-error">
              <input
                type="datetime-local"
                required
                value={draft.startedAt}
                aria-invalid={Boolean(fieldErrors.startedAt)}
                aria-describedby={fieldErrors.startedAt ? 'session-started-at-error' : undefined}
                onChange={(event) => {
                  update('startedAt', event.target.value);
                  if (event.target.value.trim()) clearFieldError('startedAt');
                }}
                className={inputClass}
                data-testid="input-session-started-at"
              />
            </InputField>
            <InputField label="Ended at" hint="Leave blank if the session is still open.">
              <input
                type="datetime-local"
                value={draft.endedAt}
                onChange={(event) => update('endedAt', event.target.value)}
                className={inputClass}
                data-testid="input-session-ended-at"
              />
            </InputField>
            <InputField label="Routine ID" hint="Optional label for the routine.">
              <input
                type="text"
                value={draft.routineId}
                onChange={(event) => update('routineId', event.target.value)}
                maxLength={200}
                className={inputClass}
                data-testid="input-session-routine-id"
              />
            </InputField>
            <InputField label="Outcome" required error={fieldErrors.outcome} errorId="session-outcome-error">
              <input
                type="text"
                value={draft.outcome}
                required
                aria-invalid={Boolean(fieldErrors.outcome)}
                aria-describedby={fieldErrors.outcome ? 'session-outcome-error' : undefined}
                onChange={(event) => {
                  update('outcome', event.target.value);
                  if (event.target.value.trim()) clearFieldError('outcome');
                }}
                maxLength={200}
                placeholder="For example, went to bed"
                className={inputClass}
                data-testid="input-session-outcome"
              />
            </InputField>
            <InputField label="Minutes delayed">
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={draft.minutesDelayed}
                onChange={(event) => update('minutesDelayed', event.target.value)}
                className={inputClass}
                data-testid="input-session-minutes-delayed"
              />
            </InputField>
            <div className="sm:col-span-2">
              <InputField label="Note">
                <textarea
                  value={draft.note}
                  onChange={(event) => update('note', event.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Anything you want to remember about this evening"
                  className={`${inputClass} min-h-28 py-3`}
                  data-testid="input-session-note"
                />
              </InputField>
            </div>
          </div>
          {error && <p className="mt-5 text-sm text-[hsl(var(--destructive))]" role="alert">{error}</p>}
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href={backHref}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[hsl(var(--border))] px-5 text-sm font-medium text-inherit no-underline hover:bg-[hsl(var(--secondary))]"
              data-testid="link-cancel-session-form"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-6 text-sm font-semibold text-[hsl(var(--primary-foreground))] hover:brightness-105 disabled:opacity-60"
              data-testid="button-save-session"
            >
              {submitting ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}
              {submitting ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function toInput(draft: SessionDraft) {
  const startedAt = fromDateTimeLocal(draft.startedAt);
  const endedAt = fromDateTimeLocal(draft.endedAt);
  const minutes = draft.minutesDelayed.trim() ? Number(draft.minutesDelayed) : null;

  return {
    startedAt,
    endedAt,
    minutes,
    body: {
      routineId: draft.routineId.trim() || null,
      startedAt: startedAt ?? '',
      endedAt,
      outcome: draft.outcome.trim() || null,
      minutesDelayed: minutes,
      note: draft.note.trim() || null,
    },
  };
}

export function NewSessionPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createSession = useCreateWindDownSession();
  const [draft, setDraft] = useState(createDraft);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SessionFieldErrors>({});

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const nextFieldErrors: SessionFieldErrors = {};
    if (!draft.startedAt.trim()) nextFieldErrors.startedAt = 'Choose when this session started.';
    if (!draft.outcome.trim()) nextFieldErrors.outcome = 'Add a short outcome before saving this session.';
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;

    const input = toInput(draft);
    if (!input.startedAt) {
      setError('Choose a valid start time.');
      return;
    }
    if (draft.endedAt && !input.endedAt) {
      setError('Choose a valid end time or leave it blank.');
      return;
    }
    if (input.minutes !== null && (!Number.isSafeInteger(input.minutes) || input.minutes < 0)) {
      setError('Minutes delayed must be a whole number of zero or more.');
      return;
    }
    createSession.mutate(
      { data: input.body },
      {
        onSuccess: async (session) => {
          await queryClient.invalidateQueries({ queryKey: getListWindDownSessionsQueryKey() });
          setLocation(`/sessions/${encodeURIComponent(session.id)}`);
        },
        onError: () => setError('This session couldn’t be saved. Please try again.'),
      },
    );
  };

  return (
    <>
      <PageHeading eyebrow="Keep what matters" title="Add a session." description="Save a few details about an evening, for your own reference." />
      <SessionFields
        draft={draft}
        setDraft={setDraft}
        submit={submit}
        submitting={createSession.isPending}
        error={error}
        fieldErrors={fieldErrors}
        clearFieldError={(field) => setFieldErrors((current) => ({ ...current, [field]: undefined }))}
        submitLabel="Save session"
        backHref="/sessions"
      />
    </>
  );
}

export function EditSessionPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const auth = useCurrentUser();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SessionFieldErrors>({});
  const session = useGetWindDownSession(sessionId, {
    query: {
      enabled: Boolean(auth.data && sessionId),
      queryKey: [...getGetWindDownSessionQueryKey(sessionId), auth.data?.id],
    },
  });
  const updateSession = useUpdateWindDownSession();

  useEffect(() => {
    if (session.data) setDraft(draftFromSession(session.data));
  }, [session.data]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;
    setError('');
    const nextFieldErrors: SessionFieldErrors = {};
    if (!draft.startedAt.trim()) nextFieldErrors.startedAt = 'Choose when this session started.';
    if (!draft.outcome.trim()) nextFieldErrors.outcome = 'Add a short outcome before saving this session.';
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;

    const input = toInput(draft);
    if (!input.startedAt) {
      setError('Choose a valid start time.');
      return;
    }
    if (draft.endedAt && !input.endedAt) {
      setError('Choose a valid end time or leave it blank.');
      return;
    }
    if (input.minutes !== null && (!Number.isSafeInteger(input.minutes) || input.minutes < 0)) {
      setError('Minutes delayed must be a whole number of zero or more.');
      return;
    }
    updateSession.mutate(
      { sessionId, data: input.body },
      {
        onSuccess: async (updated) => {
          await queryClient.invalidateQueries({ queryKey: getListWindDownSessionsQueryKey() });
          queryClient.setQueryData(
            [...getGetWindDownSessionQueryKey(sessionId), auth.data?.id],
            updated,
          );
          setLocation(`/sessions/${encodeURIComponent(sessionId)}`);
        },
        onError: () => setError('This session couldn’t be updated. Please try again.'),
      },
    );
  };

  if (session.isLoading || (!session.isError && !draft)) {
    return (
      <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
        <LoaderCircle size={18} className="animate-spin" />
        Loading this session…
      </div>
    );
  }

  if (session.isError || !draft) {
    return (
      <section className="mx-auto max-w-2xl rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] p-6 sm:p-8">
        <h1 className="font-display text-3xl">This session isn’t available.</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">It may have been removed, or it may not belong to your account.</p>
        <Link href="/sessions" className="mt-5 inline-flex min-h-11 items-center rounded-full border border-[hsl(var(--border))] px-5 text-sm font-medium text-inherit no-underline hover:bg-[hsl(var(--secondary))]">
          Back to history
        </Link>
      </section>
    );
  }

  return (
    <>
      <PageHeading eyebrow="Your saved night" title="Edit session." description="Update the details you want to keep." />
      <SessionFields
        draft={draft}
        setDraft={setDraft}
        submit={submit}
        submitting={updateSession.isPending}
        error={error}
        fieldErrors={fieldErrors}
        clearFieldError={(field) => setFieldErrors((current) => ({ ...current, [field]: undefined }))}
        submitLabel="Save changes"
        backHref={`/sessions/${encodeURIComponent(sessionId)}`}
      />
    </>
  );
}
