import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { Link } from 'wouter';
import {
  getListWindDownSessionsQueryKey,
  useListWindDownSessions,
} from '@workspace/api-client-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { PageHeading } from '@/components/shell';
import { useCurrentUser } from '@/lib/auth-api';
import { calculateDashboardStats } from '@/lib/dashboard-stats';

const sessionsChartConfig = {
  count: {
    label: 'Sessions',
    color: 'hsl(var(--accent))',
  },
} satisfies ChartConfig;

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <section className="rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] p-5 sm:p-6">
      <p className="text-sm text-[hsl(var(--muted-foreground))]">{label}</p>
      <p className="font-display mt-3 text-4xl leading-none tracking-[-.03em] text-[hsl(var(--foreground))]">
        {value}
      </p>
      <p className="mt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
        {note}
      </p>
    </section>
  );
}

export default function DashboardPage() {
  const auth = useCurrentUser();
  const sessions = useListWindDownSessions({
    query: {
      enabled: Boolean(auth.data),
      queryKey: [...getListWindDownSessionsQueryKey(), auth.data?.id],
    },
  });
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const stats = useMemo(
    () =>
      calculateDashboardStats(
        sessions.data ?? [],
        new Date(),
        timeZone,
      ),
    [sessions.data, timeZone],
  );
  const averageDelay =
    stats.averageMinutesDelayed === null
      ? '—'
      : `${new Intl.NumberFormat(undefined, {
          maximumFractionDigits: 1,
        }).format(stats.averageMinutesDelayed)} min`;

  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="Your evenings, at a glance"
        title="Dashboard."
        description="A gentle look at the sessions you’ve saved, without scores or streaks."
        action={
          <Link
            href="/sessions"
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full border border-[hsl(var(--border))] px-4 text-sm font-medium text-inherit no-underline hover:bg-[hsl(var(--secondary))] sm:self-auto"
            data-testid="link-dashboard-history"
          >
            Session history <ArrowRight size={15} />
          </Link>
        }
      />

      {sessions.isLoading ? (
        <section className="flex min-h-40 items-center justify-center gap-3 rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] text-sm text-[hsl(var(--muted-foreground))]">
          <LoaderCircle size={18} className="animate-spin" />
          Gathering your sessions…
        </section>
      ) : sessions.isError ? (
        <section className="rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] p-6 sm:p-8">
          <h2 className="font-display text-2xl">Your dashboard didn’t load.</h2>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            Check your connection, then try again.
          </p>
          <button
            type="button"
            onClick={() => sessions.refetch()}
            className="mt-5 min-h-11 rounded-full border border-[hsl(var(--border))] px-5 text-sm font-medium hover:bg-[hsl(var(--secondary))]"
            data-testid="button-retry-dashboard"
          >
            Try again
          </button>
        </section>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Total sessions"
              value={new Intl.NumberFormat().format(stats.totalSessions)}
              note="Every session saved to your history."
            />
            <MetricCard
              label="Average minutes delayed"
              value={averageDelay}
              note={
                stats.averageMinutesDelayed === null
                  ? 'No delay minutes recorded yet.'
                  : 'Only sessions with a recorded delay are included.'
              }
            />
            <MetricCard
              label="Completed sessions"
              value={new Intl.NumberFormat().format(stats.completedSessions)}
              note="Sessions with an end time recorded."
            />
          </div>

          <section className="mt-5 rounded-[1.5rem] border border-[hsl(var(--card-border)/.66)] bg-[hsl(var(--card))] p-5 sm:p-7">
            <div className="mb-5">
              <h2 className="font-display text-2xl sm:text-3xl">
                Sessions over the last 7 days.
              </h2>
              <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
                Counted by captured start time; legacy requests without one use their completion log time.
              </p>
            </div>
            <ChartContainer
              config={sessionsChartConfig}
              className="h-[260px] w-full aspect-auto"
              role="img"
              aria-label="Bar chart of your session counts for each of the past seven days."
            >
              <BarChart
                accessibilityLayer
                data={stats.weeklySessionCounts}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={4}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={42}
                />
              </BarChart>
            </ChartContainer>
            <p className="sr-only">
              {stats.weeklySessionCounts
                .map(({ label, count }) => `${label}: ${count} sessions`)
                .join('. ')}
            </p>
            {stats.totalSessions === 0 && (
              <p className="mt-3 text-center text-sm text-[hsl(var(--muted-foreground))]">
                Your chart will fill in as you save sessions.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
