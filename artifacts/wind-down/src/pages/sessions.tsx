import { ArrowRight, Clock3, LoaderCircle, Plus } from 'lucide-react';
import { Link } from 'wouter';
import { getListWindDownSessionsQueryKey, useListWindDownSessions } from '@workspace/api-client-react';
import { PageHeading } from '@/components/shell';
import { useCurrentUser } from '@/lib/auth-api';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function SessionHistoryPage() {
  const auth = useCurrentUser();
  const sessions = useListWindDownSessions({
    query: {
      enabled: Boolean(auth.data),
      queryKey: [...getListWindDownSessionsQueryKey(), auth.data?.id],
    },
  });

  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Your saved nights"
        title="Session history."
        description="A private record of the evenings you’ve made room for rest."
        action={
          <Link
            href="/sessions/new"
            className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-[hsl(var(--primary-foreground))] no-underline transition-colors hover:brightness-105 sm:self-auto"
            data-testid="link-add-session"
          >
            <Plus size={17} />
            Add session
          </Link>
        }
      />

      {sessions.isLoading ? (
        <section className="flex min-h-40 items-center justify-center gap-3 rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] text-sm text-[hsl(var(--muted-foreground))]">
          <LoaderCircle size={18} className="animate-spin" />
          Loading your sessions…
        </section>
      ) : sessions.isError ? (
        <section className="rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] p-6 sm:p-8">
          <h2 className="font-display text-2xl">Your history didn’t load.</h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Check your connection, then try again.</p>
          <button
            type="button"
            onClick={() => sessions.refetch()}
            className="mt-5 min-h-11 rounded-full border border-[hsl(var(--border))] px-5 text-sm font-medium hover:bg-[hsl(var(--secondary))]"
            data-testid="button-retry-sessions"
          >
            Try again
          </button>
        </section>
      ) : sessions.data?.length ? (
        <div className="grid gap-3">
          {sessions.data.map((session) => (
            <Link
              key={session.id}
              href={`/sessions/${encodeURIComponent(session.id)}`}
              className="group block rounded-[1.25rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] p-5 text-inherit no-underline transition-colors hover:bg-[hsl(var(--secondary))] sm:p-6"
              data-testid={`link-session-${session.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                    <Clock3 size={14} className="shrink-0 text-[hsl(var(--accent))]" />
                    <span>{formatDate(session.startedAt)}</span>
                  </p>
                  <h2 className="mt-3 break-words font-display text-2xl leading-tight">
                    {session.note?.trim() || 'Wind-down session'}
                  </h2>
                  <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                    {session.outcome?.trim() || 'No outcome recorded'}
                    {session.minutesDelayed !== null && ` · ${session.minutesDelayed} minutes delayed`}
                  </p>
                </div>
                <ArrowRight size={18} className="mt-1 shrink-0 text-[hsl(var(--accent))] transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <section className="rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] px-6 py-10 text-center sm:px-10 sm:py-12">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-[hsl(var(--accent)/.1)] text-[hsl(var(--accent))]">
            <Clock3 size={20} />
          </div>
          <h2 className="font-display mt-5 text-2xl">Your history starts when you’re ready.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[hsl(var(--muted-foreground))]">
            Add a session to keep a private note of how an evening went.
          </p>
          <Link
            href="/sessions/new"
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 text-sm font-semibold text-[hsl(var(--primary-foreground))] no-underline"
            data-testid="link-add-first-session"
          >
            <Plus size={17} />
            Add your first session
          </Link>
        </section>
      )}
    </div>
  );
}
