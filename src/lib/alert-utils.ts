export const MAX_ACTIVE_ALERTS = 10

export function hasCrossedThreshold(
  previous: number,
  current: number,
  direction: 'ABOVE' | 'BELOW',
  threshold: number,
): boolean {
  return direction === 'ABOVE'
    ? previous < threshold && current >= threshold
    : previous > threshold && current <= threshold
}
