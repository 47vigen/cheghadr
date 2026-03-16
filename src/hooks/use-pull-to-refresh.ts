'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const PULL_THRESHOLD = 72 // px before triggering refresh

/**
 * Adds pull-to-refresh behavior to the page. Returns `isRefreshing` so the
 * caller can show a loading indicator. The `onRefresh` callback is called
 * when the pull gesture crosses the threshold.
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startYRef = useRef<number | null>(null)
  const isTouching = useRef(false)

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing, onRefresh])

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0 && e.touches.length === 1) {
        startYRef.current = e.touches[0]?.clientY ?? null
        isTouching.current = true
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!isTouching.current || startYRef.current === null) return
      const dy = (e.touches[0]?.clientY ?? 0) - startYRef.current
      if (dy > PULL_THRESHOLD && window.scrollY === 0) {
        isTouching.current = false
        void handleRefresh()
      }
    }

    const onTouchEnd = () => {
      isTouching.current = false
      startYRef.current = null
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [handleRefresh])

  return { isRefreshing }
}
