import type { PortfolioDeltaWindow } from '@/lib/portfolio-snapshot-delta'

export type PortfolioHistoryWindow = PortfolioDeltaWindow

/** Inclusive calendar days in the chart for 1D/1W (7d) and 1M (30d). ALL uses null. */
export function getHistoryWindowDayCount(
  window: PortfolioHistoryWindow,
): number | null {
  switch (window) {
    case '1D':
    case '1W':
      return 7
    case '1M':
      return 30
    case 'ALL':
      return null
    default:
      return 7
  }
}

export function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  )
}

export function addUtcDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setUTCDate(x.getUTCDate() + days)
  return x
}

function dayKeyUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/** Noon UTC for chart x-values (stable tick positioning). */
function utcNoonForDay(dayStart: Date): Date {
  return new Date(
    Date.UTC(
      dayStart.getUTCFullYear(),
      dayStart.getUTCMonth(),
      dayStart.getUTCDate(),
      12,
      0,
      0,
      0,
    ),
  )
}

export interface PortfolioSnapshotPoint {
  snapshotAt: Date
  totalIRT: number
}

/**
 * One point per calendar day (UTC), forward-filled from the last known snapshot.
 * `rangeStart` and `rangeEnd` are inclusive day starts (UTC).
 */
export function buildDailyPortfolioHistorySeries(
  rangeStart: Date,
  rangeEnd: Date,
  snapshotsInRange: PortfolioSnapshotPoint[],
  carryBeforeRange: number | null,
): Array<{ date: Date; totalIRT: number }> {
  const sorted = [...snapshotsInRange].sort(
    (a, b) => a.snapshotAt.getTime() - b.snapshotAt.getTime(),
  )

  const lastByDay = new Map<string, number>()
  for (const s of sorted) {
    lastByDay.set(dayKeyUtc(s.snapshotAt), s.totalIRT)
  }

  let carry = carryBeforeRange ?? undefined

  const out: Array<{ date: Date; totalIRT: number }> = []
  const end = startOfUtcDay(rangeEnd)

  for (
    let day = startOfUtcDay(rangeStart);
    day.getTime() <= end.getTime();
    day = addUtcDays(day, 1)
  ) {
    const key = dayKeyUtc(day)
    if (lastByDay.has(key)) {
      carry = lastByDay.get(key)
    }
    if (carry !== undefined) {
      out.push({ date: utcNoonForDay(day), totalIRT: carry })
    }
  }

  return out
}

/**
 * Inclusive UTC day range for the chart. `rangeEnd` is the start of the last
 * calendar day in the window (same as `startOfUtcDay` for "today").
 */
export function getPortfolioHistoryRange(
  window: PortfolioHistoryWindow,
  firstSnapshotAt: Date | null,
): { rangeStart: Date; rangeEnd: Date } | null {
  const todayStart = startOfUtcDay(new Date())
  if (window === 'ALL') {
    if (!firstSnapshotAt) return null
    return {
      rangeStart: startOfUtcDay(firstSnapshotAt),
      rangeEnd: todayStart,
    }
  }
  const n = getHistoryWindowDayCount(window) ?? 7
  const rangeStart = addUtcDays(todayStart, -(n - 1))
  return { rangeStart, rangeEnd: todayStart }
}
