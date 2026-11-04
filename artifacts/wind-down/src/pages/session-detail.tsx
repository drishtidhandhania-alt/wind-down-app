import { useState } from 'react';
import { ArrowLeft, CalendarClock, LoaderCircle, Pencil, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'wouter';
import {
  getGetWindDownSessionQueryKey,
  getListWindDownSessionsQueryKey,
  useDeleteWindDownSession,
  useGetWindDownSession,
} from '@workspace/api-client-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCurrentUser } from '@/lib/auth-api';

function formatDate(value: string | null): string {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(value));
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[hsl(var(--background)/.45)] p-4 sm:p-5">
      <dt className="font-mono text-xs text-[hsl(var(--muted-foreground))]">{label}</dt>
      <dd className="mt-2 break-words text-base text-[hsl(var(--foreground))]">{value}</dd>
    </div>
  );
}

export default function SessionDetailPage() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const auth = useCurrentUser();
  const [, setLocation] = useLocation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const queryClient = useQueryClient();
  const session = useGetWindDownSession(sessionId, {
    query: {
      enabled: Boolean(auth.data && sessionId),
      queryKey: [...getGetWindDownSessionQueryKey(sessionId), auth.data?.id],
    },
  });
  const removeSession = useDeleteWindDownSession();

  const deleteSession = () => {
    removeSession.mutate(
      { sessionId },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: getListWindDownSessionsQueryKey() });
          queryClient.removeQueries({ queryKey: getGetWindDownSessionQueryKey(sessionId) });
          setConfirmDelete(false);
          setLocation('/sessions');
        },
      },
    );
  };

  if (session.isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-[hsl(var(--muted-foreground))]">
        <LoaderCircle size={18} className="animate-spin" />
        Loading this session…
      </div>
    );
  }

  if (session.isError || !session.data) {
    return (
      <section className="mx-auto max-w-2xl rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] p-6 sm:p-8">
        <Link href="/sessions" className="inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] no-underline hover:text-[hsl(var(--foreground))]">
          <ArrowLeft size={15} /> Session history
        </Link>
        <h1 className="font-display mt-7 text-3xl">This session isn’t available.</h1>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">It may have been removed, or it may not belong to your account.</p>
        <Link href="/sessions" className="mt-5 inline-flex min-h-11 items-center rounded-full border border-[hsl(var(--border))] px-5 text-sm font-medium text-inherit no-underline hover:bg-[hsl(var(--secondary))]">
          Back to history
        </Link>
      </section>
    );
  }

  const record = session.data;
  return (
    <div className="page-enter mx-auto max-w-3xl">
      <Link href="/sessions" className="mb-7 inline-flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] no-underline hover:text-[hsl(var(--foreground))]" data-testid="link-back-session-history">
        <ArrowLeft size={15} /> Session history
      </Link>
      <section className="rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-mono text-xs text-[hsl(var(--accent))]">
              <CalendarClock size={15} /> Saved session
            </p>
            <h1 className="font-display mt-3 break-words text-3xl leading-tight tracking-[-.025em] sm:text-4xl">
              {record.note?.trim() || 'Wind-down session'}
            </h1>
            <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
              Started {formatDate(record.startedAt)}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/sessions/${encodeURIComponent(record.id)}/edit`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[hsl(var(--border))] px-4 text-sm font-medium text-inherit no-underline hover:bg-[hsl(var(--secondary))]"
              data-testid="link-edit-session"
            >
              <Pencil size={15} /> Edit
            </Link>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[hsl(var(--destructive)/.4)] px-4 text-sm font-medium text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.08)]"
              data-testid="button-delete-session"
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </div>

        <dl className="mt-7 grid gap-3 sm:grid-cols-2">
          <DetailField label="Started" value={formatDate(record.startedAt)} />
          <DetailField label="Ended" value={formatDate(record.endedAt)} />
          <DetailField label="Routine ID" value={record.routineId || 'Not recorded'} />
          <DetailField label="Outcome" value={record.outcome || 'Not recorded'} />
          <DetailField
            label="Minutes delayed"
            value={record.minutesDelayed === null ? 'Not recorded' : String(record.minutesDelayed)}
          />
          <DetailField label="Note" value={record.note?.trim() || 'Not recorded'} />
        </dl>
        {removeSession.isError && (
          <p className="mt-5 text-sm text-[hsl(var(--destructive))]" role="alert">
            This session couldn’t be deleted. Please try again.
          </p>
        )}
      </section>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="border-[hsl(var(--card-border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] sm:rounded-[1.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-[hsl(var(--muted-foreground))]">
              This session will be permanently deleted from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={removeSession.isPending}
              className="rounded-full border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
              data-testid="button-cancel-delete-session"
            >
              Keep session
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={removeSession.isPending}
              onClick={(event) => {
                event.preventDefault();
                deleteSession();
              }}
              className="rounded-full bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]"
              data-testid="button-confirm-delete-session"
            >
              {removeSession.isPending ? 'Deleting…' : 'Delete session'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
