export type DashboardSession = {
  startedAt: string;
  endedAt: string | null;
  minutesDelayed: number | null;
};

export type DashboardStats = {
  totalSessions: number;
  averageMinutesDelayed: number | null;
  completedSessions: number;
  weeklySessionCounts: Array<{
    date: string;
    label: string;
    count: number;
  }>;
};

function dateKeyInTimeZone(
  date: Date,
  formatter: Intl.DateTimeFormat,
): string | null {
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
}

export function calculateDashboardStats(
  sessions: readonly DashboardSession[],
  asOf: Date,
  timeZone: string,
): DashboardStats {
  let delayedMinutesTotal = 0;
  let delayedSessionsCount = 0;
  let completedSessions = 0;

  for (const session of sessions) {
    if (session.minutesDelayed !== null) {
      delayedMinutesTotal += session.minutesDelayed;
      delayedSessionsCount += 1;
    }
    if (session.endedAt !== null) completedSessions += 1;
  }

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayKey = dateKeyInTimeZone(asOf, dateFormatter);
  if (!todayKey) throw new Error('Could not determine the current calendar day.');
  const [year, month, day] = todayKey.split('-').map(Number);

  const labelFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  });
  const weeklySessionCounts = Array.from({ length: 7 }, (_, index) => {
    const calendarDate = new Date(
      Date.UTC(year, month - 1, day - (6 - index), 12),
    );
    return {
      date: calendarDate.toISOString().slice(0, 10),
      label: labelFormatter.format(calendarDate),
      count: 0,
    };
  });
  const countByDate = new Map(
    weeklySessionCounts.map((entry, index) => [entry.date, index]),
  );

  for (const session of sessions) {
    const startedAt = new Date(session.startedAt);
    if (Number.isNaN(startedAt.getTime())) continue;
    const date = dateKeyInTimeZone(startedAt, dateFormatter);
    const index = date ? countByDate.get(date) : undefined;
    if (index !== undefined) weeklySessionCounts[index].count += 1;
  }

  return {
    totalSessions: sessions.length,
    averageMinutesDelayed:
      delayedSessionsCount === 0
        ? null
        : delayedMinutesTotal / delayedSessionsCount,
    completedSessions,
    weeklySessionCounts,
  };
}
