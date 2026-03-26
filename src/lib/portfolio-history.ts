import { TZDate } from '@date-fns/tz'
import { addDays, format } from 'date-fns'

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

function dayKeyInTimeZone(instant: Date, timeZone: string): string {
  return format(new TZDate(instant, timeZone), 'yyyy-MM-dd')
}

/** Start of calendar day in `timeZone` as a UTC `Date` (instant). */
export function startOfDayInTimeZone(instant: Date, timeZone: string): Date {
  const ymd = dayKeyInTimeZone(instant, timeZone)
  return TZDate.tz(timeZone, `${ymd}T00:00:00`)
}

/** Noon on that calendar day in `timeZone` (stable chart x-position). */
export function noonInTimeZoneForYmd(ymd: string, timeZone: string): Date {
  return TZDate.tz(timeZone, `${ymd}T12:00:00`)
}

export interface PortfolioSnapshotPoint {
  snapshotAt: Date
  totalIRT: number
}

/**
 * One point per calendar day in `timeZone`, forward-filled from the last known snapshot.
 * `rangeStart` / `rangeEnd` are UTC instants at start-of-day for first/last inclusive day.
 */
export function buildDailyPortfolioHistorySeries(
  rangeStart: Date,
  rangeEnd: Date,
  snapshotsInRange: PortfolioSnapshotPoint[],
  carryBeforeRange: number | null,
  timeZone: string,
): Array<{ date: Date; totalIRT: number }> {
  const sorted = [...snapshotsInRange].sort(
    (a, b) => a.snapshotAt.getTime() - b.snapshotAt.getTime(),
  )

  const lastByDay = new Map<string, number>()
  for (const s of sorted) {
    lastByDay.set(dayKeyInTimeZone(s.snapshotAt, timeZone), s.totalIRT)
  }

  let carry = carryBeforeRange ?? undefined

  const endKey = dayKeyInTimeZone(rangeEnd, timeZone)

  const out: Array<{ date: Date; totalIRT: number }> = []

  for (
    let d = new TZDate(rangeStart, timeZone);
    dayKeyInTimeZone(d, timeZone) <= endKey;
    d = addDays(d, 1)
  ) {
    const key = dayKeyInTimeZone(d, timeZone)
    if (lastByDay.has(key)) {
      carry = lastByDay.get(key)
    }
    if (carry !== undefined) {
      out.push({
        date: noonInTimeZoneForYmd(key, timeZone),
        totalIRT: carry,
      })
    }
  }

  return out
}

/**
 * Inclusive day range as UTC instants (start of first/last calendar day in `timeZone`).
 */
export function getPortfolioHistoryRange(
  window: PortfolioHistoryWindow,
  firstSnapshotAt: Date | null,
  timeZone: string,
): { rangeStart: Date; rangeEnd: Date } | null {
  const nowInZone = new TZDate(Date.now(), timeZone)
  const todayStart = startOfDayInTimeZone(nowInZone, timeZone)

  if (window === 'ALL') {
    if (!firstSnapshotAt) return null
    return {
      rangeStart: startOfDayInTimeZone(firstSnapshotAt, timeZone),
      rangeEnd: todayStart,
    }
  }

  const n = getHistoryWindowDayCount(window) ?? 7
  const startAnchor = addDays(nowInZone, -(n - 1))
  const rangeStart = startOfDayInTimeZone(startAnchor, timeZone)

  return { rangeStart, rangeEnd: todayStart }
}

/** Start of the calendar day after `rangeEnd` (exclusive upper bound for DB queries). */
export function exclusiveEndAfterRange(rangeEnd: Date, timeZone: string): Date {
  return startOfDayInTimeZone(
    addDays(new TZDate(rangeEnd, timeZone), 1),
    timeZone,
  )
}
