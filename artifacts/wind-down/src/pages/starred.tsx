import { LoaderCircle, Star } from 'lucide-react';
import { Link } from 'wouter';
import { PageHeading } from '@/components/shell';
import { SessionCard } from '@/components/session-card';
import { useCurrentUser } from '@/lib/auth-api';
import { useSessionStars } from '@/lib/session-stars';

export default function StarredSessionsPage() {
  const auth = useCurrentUser();
  const stars = useSessionStars(auth.data?.id);
  const sessions = stars.query;

  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Kept close"
        title="Starred sessions."
        description="The evenings you’d like to find again, gathered in one quiet place."
      />

      {sessions.isLoading ? (
        <section className="flex min-h-40 items-center justify-center gap-3 rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] text-sm text-[hsl(var(--muted-foreground))]">
          <LoaderCircle size={18} className="animate-spin" />
          Loading your starred sessions…
        </section>
      ) : sessions.isError ? (
        <section className="rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] p-6 sm:p-8">
          <h2 className="font-display text-2xl">Your starred sessions didn’t load.</h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            Check your connection, then try again.
          </p>
          <button
            type="button"
            onClick={() => sessions.refetch()}
            className="mt-5 min-h-11 rounded-full border border-[hsl(var(--border))] px-5 text-sm font-medium hover:bg-[hsl(var(--secondary))]"
            data-testid="button-retry-starred-sessions"
          >
            Try again
          </button>
        </section>
      ) : sessions.data?.length ? (
        <>
          {stars.actionError && (
            <p className="mb-4 text-sm text-[hsl(var(--destructive))]" role="alert">
              We couldn’t update that star. Please try again.
            </p>
          )}
          <div className="grid gap-3">
            {sessions.data.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isStarred
                starDisabled={stars.isPending}
                onToggleStar={() => stars.toggle(session.id, true)}
              />
            ))}
          </div>
        </>
      ) : (
        <section className="rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] px-6 py-10 text-center sm:px-10 sm:py-12">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-[hsl(var(--accent)/.1)] text-[hsl(var(--accent))]">
            <Star size={20} />
          </div>
          <h2 className="font-display mt-5 text-2xl">Nothing starred just yet.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[hsl(var(--muted-foreground))]">
            When a session feels worth keeping close, tap its star and it’ll be here.
          </p>
          <Link
            href="/sessions"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-[hsl(var(--border))] px-5 text-sm font-medium text-inherit no-underline hover:bg-[hsl(var(--secondary))]"
            data-testid="link-browse-session-history"
          >
            Browse session history
          </Link>
        </section>
      )}
    </div>
  );
}
