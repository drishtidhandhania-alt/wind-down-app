import { Clock3, LoaderCircle, Plus } from 'lucide-react';
import { Link } from 'wouter';
import { getListWindDownSessionsQueryKey, useListWindDownSessions } from '@workspace/api-client-react';
import { PageHeading } from '@/components/shell';
import { SessionCard } from '@/components/session-card';
import { useCurrentUser } from '@/lib/auth-api';
import { useSessionStars } from '@/lib/session-stars';

export default function SessionHistoryPage() {
  const auth = useCurrentUser();
  const stars = useSessionStars(auth.data?.id);
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

      {stars.query.isError && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[hsl(var(--destructive))]" role="alert">
          <span>Star status didn’t load, so stars are temporarily unavailable.</span>
          <button
            type="button"
            onClick={() => stars.query.refetch()}
            className="min-h-9 rounded-full border border-[hsl(var(--border))] px-3 text-xs font-medium text-[hsl(var(--foreground))]"
            data-testid="button-retry-session-stars"
          >
            Try again
          </button>
        </div>
      )}
      {stars.actionError && (
        <p className="mb-4 text-sm text-[hsl(var(--destructive))]" role="alert">
          We couldn’t update that star. Please try again.
        </p>
      )}

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
            onClick={() => { sessions.refetch(); stars.query.refetch(); }}
            className="mt-5 min-h-11 rounded-full border border-[hsl(var(--border))] px-5 text-sm font-medium hover:bg-[hsl(var(--secondary))]"
            data-testid="button-retry-sessions"
          >
            Try again
          </button>
        </section>
      ) : sessions.data?.length ? (
        <div className="grid gap-3">
          {sessions.data.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isStarred={stars.isStarred(session.id)}
              starDisabled={stars.query.isLoading || stars.query.isError || stars.isPending}
              onToggleStar={() => stars.toggle(session.id, stars.isStarred(session.id))}
            />
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
