'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const PULL_THRESHOLD = 72

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Stable ref so the effect doesn't re-register listeners on every render
  const onRefreshRef = useRef(onRefresh)
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  const isRefreshingRef = useRef(false)
  const startYRef = useRef<number | null>(null)
  const isTouching = useRef(false)

  const handleRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return
    isRefreshingRef.current = true
    setIsRefreshing(true)
    try {
      await onRefreshRef.current()
    } finally {
      isRefreshingRef.current = false
      setIsRefreshing(false)
    }
  }, [])

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
