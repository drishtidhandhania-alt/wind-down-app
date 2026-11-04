import { useMemo, useState } from 'react';
import { Clock3, LoaderCircle, Plus } from 'lucide-react';
import { Link } from 'wouter';
import { getListWindDownSessionsQueryKey, useListWindDownSessions } from '@workspace/api-client-react';
import { PageHeading } from '@/components/shell';
import { SessionCard } from '@/components/session-card';
import { useCurrentUser } from '@/lib/auth-api';
import { useSessionStars } from '@/lib/session-stars';

type SessionSortOrder = 'newest' | 'oldest';

export default function SessionHistoryPage() {
  const auth = useCurrentUser();
  const [searchText, setSearchText] = useState('');
  const [sortOrder, setSortOrder] = useState<SessionSortOrder>('newest');
  const stars = useSessionStars(auth.data?.id);
  const sessions = useListWindDownSessions({
    query: {
      enabled: Boolean(auth.data),
      queryKey: [...getListWindDownSessionsQueryKey(), auth.data?.id],
    },
  });
  const visibleSessions = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return [...(sessions.data ?? [])]
      .filter((session) => {
        if (!search) return true;
        return [session.note, session.outcome, session.routineId]
          .some((value) => value?.toLowerCase().includes(search));
      })
      .sort((left, right) => {
        const difference =
          new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime();
        return sortOrder === 'newest' ? -difference : difference;
      });
  }, [searchText, sessions.data, sortOrder]);

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

      {!sessions.isLoading && !sessions.isError && Boolean(sessions.data?.length) && (
        <section className="mb-5 grid gap-3 rounded-[1.25rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] p-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-end">
          <label htmlFor="session-search" className="block text-sm font-medium">
            Find a session
            <input
              id="session-search"
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Note, outcome, or routine ID"
              className="mt-2 block min-h-11 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.65)] px-4 text-base text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]"
              data-testid="input-session-search"
            />
          </label>
          <label htmlFor="session-sort" className="block text-sm font-medium">
            Sort by
            <select
              id="session-sort"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as SessionSortOrder)}
              className="mt-2 block min-h-11 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.65)] px-3 text-base text-[hsl(var(--foreground))]"
              data-testid="select-session-sort"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
        </section>
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
      ) : sessions.data?.length && visibleSessions.length ? (
        <div className="grid gap-3">
          {visibleSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isStarred={stars.isStarred(session.id)}
              starDisabled={stars.query.isLoading || stars.query.isError || stars.isPending}
              onToggleStar={() => stars.toggle(session.id, stars.isStarred(session.id))}
            />
          ))}
        </div>
      ) : sessions.data?.length ? (
        <section className="rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] px-6 py-10 text-center sm:px-10 sm:py-12">
          <h2 className="font-display text-2xl">Nothing matches that search.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[hsl(var(--muted-foreground))]">
            Try another word, or clear the search to see all your sessions.
          </p>
          <button
            type="button"
            onClick={() => setSearchText('')}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-[hsl(var(--border))] px-5 text-sm font-medium hover:bg-[hsl(var(--secondary))]"
            data-testid="button-clear-session-search"
          >
            Clear search
          </button>
        </section>
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
