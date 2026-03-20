export const STALE_AFTER_MINUTES = 60

export function getSnapshotStaleness(
  snapshotAt: Date | null | undefined,
  staleAfterMinutes = STALE_AFTER_MINUTES,
): { stale: boolean; minutesOld: number } {
  if (!snapshotAt) {
    return { stale: true, minutesOld: Number.POSITIVE_INFINITY }
  }

  const minutesOld = (Date.now() - snapshotAt.getTime()) / 1000 / 60
  return { stale: minutesOld > staleAfterMinutes, minutesOld }
}
