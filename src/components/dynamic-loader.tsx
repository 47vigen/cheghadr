'use client'

interface DynamicLoaderProps {
  /** Inline loader with fixed height (e.g. for chart placeholder). Omit for full-screen. */
  height?: number | string
}

/**
 * Shared loader for dynamic imports. Uses plain CSS so it works
 * both inside and outside AppRoot (e.g. initial ClientRoot load).
 */
export function DynamicLoader({ height }: DynamicLoaderProps) {
  const size = height ? 32 : 40
  const spinner = (
    <div
      className="animate-spin rounded-full border-2 border-neutral-400 border-t-transparent"
      style={{ width: size, height: size }}
      aria-hidden
    />
  )

  if (height !== undefined) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
        role="status"
        aria-label="Loading"
      >
        {spinner}
      </div>
    )
  }

  return (
    <div
      className="flex min-h-svh items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      {spinner}
    </div>
  )
}
