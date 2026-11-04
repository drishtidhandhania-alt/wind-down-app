import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateDashboardStats,
  type DashboardSession,
} from './dashboard-stats.ts';

const asOf = new Date('2026-05-21T12:00:00.000Z');

function session(
  startedAt: string,
  minutesDelayed: number | null,
  endedAt: string | null = null,
): DashboardSession {
  return { startedAt, minutesDelayed, endedAt };
}

test('averages three recorded delay values without changing the expected calculation', () => {
  const sessions = [
    session('2026-05-21T09:00:00.000Z', 5, '2026-05-21T09:20:00.000Z'),
    session('2026-05-20T09:00:00.000Z', 10),
    session('2026-05-19T09:00:00.000Z', 15, '2026-05-19T09:20:00.000Z'),
  ];

  const stats = calculateDashboardStats(sessions, asOf, 'UTC');

  assert.equal(stats.averageMinutesDelayed, 10);
  assert.equal(stats.totalSessions, 3);
  assert.equal(stats.completedSessions, 2);
});

test('excludes null delay values and keeps a real zero in the average', () => {
  const withZero = calculateDashboardStats(
    [
      session('2026-05-21T09:00:00.000Z', 0),
      session('2026-05-20T09:00:00.000Z', null),
    ],
    asOf,
    'UTC',
  );
  const withNull = calculateDashboardStats(
    [
      session('2026-05-21T09:00:00.000Z', 5),
      session('2026-05-20T09:00:00.000Z', null),
      session('2026-05-19T09:00:00.000Z', 15),
    ],
    asOf,
    'UTC',
  );

  assert.equal(withZero.averageMinutesDelayed, 0);
  assert.equal(withNull.averageMinutesDelayed, 10);
});

test('returns empty-safe statistics and seven zero-count days when there are no sessions', () => {
  const stats = calculateDashboardStats([], asOf, 'UTC');

  assert.equal(stats.totalSessions, 0);
  assert.equal(stats.averageMinutesDelayed, null);
  assert.equal(stats.completedSessions, 0);
  assert.equal(stats.weeklySessionCounts.length, 7);
  assert.deepEqual(
    stats.weeklySessionCounts.map(({ count }) => count),
    [0, 0, 0, 0, 0, 0, 0],
  );
});

test('counts only session start dates in the seven-day local calendar window', () => {
  const stats = calculateDashboardStats(
    [
      session('2026-05-15T12:00:00.000Z', null),
      session('2026-05-13T23:59:00.000Z', null),
      session('2026-05-21T05:00:00.000Z', null),
    ],
    asOf,
    'UTC',
  );

  assert.deepEqual(
    stats.weeklySessionCounts.map(({ date, count }) => [date, count]),
    [
      ['2026-05-15', 1],
      ['2026-05-16', 0],
      ['2026-05-17', 0],
      ['2026-05-18', 0],
      ['2026-05-19', 0],
      ['2026-05-20', 0],
      ['2026-05-21', 1],
    ],
  );
});
