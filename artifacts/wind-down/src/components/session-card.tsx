import { ArrowRight, Clock3 } from 'lucide-react';
import { Link } from 'wouter';
import type { WindDownSession } from '@workspace/api-client-react';
import { SessionStarButton } from '@/components/session-star-button';

const LEGACY_ROUTINE_NOTE_PREFIX =
  'Actual start time and duration were not recorded.';

function formatDate(value: string | null): string {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function SessionCard({
  session,
  isStarred,
  starDisabled,
  onToggleStar,
}: {
  session: WindDownSession;
  isStarred: boolean;
  starDisabled: boolean;
  onToggleStar: () => void;
}) {
  const isRoutineCompletion = session.outcome === 'routine_completed';
  const isLegacyRoutineCompletion =
    isRoutineCompletion &&
    session.note?.startsWith(LEGACY_ROUTINE_NOTE_PREFIX);
  const displayTime = isLegacyRoutineCompletion
    ? session.endedAt ?? session.startedAt
    : session.startedAt;

  return (
    <article className="flex items-start gap-3 rounded-[1.25rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] p-4 transition-colors hover:bg-[hsl(var(--secondary))] sm:gap-4 sm:p-5">
      <Link
        href={`/sessions/${encodeURIComponent(session.id)}`}
        className="group flex min-w-0 flex-1 items-start justify-between gap-3 text-inherit no-underline"
        data-testid={`link-session-${session.id}`}
      >
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
            <Clock3 size={14} className="shrink-0 text-[hsl(var(--accent))]" />
            <span>{formatDate(displayTime)}</span>
          </p>
          <h2 className="mt-3 break-words font-display text-2xl leading-tight">
            {isRoutineCompletion
              ? 'Three-step wind-down'
              : session.note?.trim() || 'Wind-down session'}
          </h2>
          <p className="mt-2 break-words text-sm text-[hsl(var(--muted-foreground))]">
            {isRoutineCompletion
              ? 'Routine completed'
              : session.outcome?.trim() || 'No outcome recorded'}
            {session.minutesDelayed !== null &&
              ` · ${session.minutesDelayed} minutes delayed`}
          </p>
          {isLegacyRoutineCompletion && (
            <p className="mt-2 break-words text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              {session.note}
            </p>
          )}
        </div>
        <ArrowRight
          size={18}
          className="mt-1 shrink-0 text-[hsl(var(--accent))] transition-transform group-hover:translate-x-1"
        />
      </Link>
      <SessionStarButton
        sessionId={session.id}
        isStarred={isStarred}
        disabled={starDisabled}
        onToggle={onToggleStar}
      />
    </article>
  );
}
