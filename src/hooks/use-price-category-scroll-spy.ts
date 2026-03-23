'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { priceCategorySectionId } from '@/lib/prices/anchors'

/**
 * Scroll spy for window/document scrolling. Uses IntersectionObserver so updates
 * still run when `window` "scroll" events are coalesced or skipped (e.g. during
 * smooth `scrollIntoView`). Activation uses a viewport-fixed scan line.
 */
export function usePriceCategoryScrollSpy(
  categories: string[],
  /** Distance from viewport top to the scan line (px); place below sticky chips. */
  activationOffsetPx = 96,
) {
  const [activeId, setActiveId] = useState('')
  const programmaticUntil = useRef(0)
  const categoriesRef = useRef(categories)
  categoriesRef.current = categories

  const categoriesKey = categories.join('|')

  const lockProgrammatic = useCallback((ms = 750) => {
    programmaticUntil.current = Date.now() + ms
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: categoriesKey encodes the full ordered id list; length alone misses same-length swaps.
  useEffect(() => {
    const cats = categoriesRef.current
    if (cats.length === 0) {
      setActiveId('')
      return
    }
    const first = cats[0]
    if (first === undefined) return
    setActiveId((prev) => (prev && cats.includes(prev) ? prev : first))
  }, [categoriesKey])

  // biome-ignore lint/correctness/useExhaustiveDependencies: categoriesKey tracks id list identity when search/filter changes; length alone is insufficient.
  useEffect(() => {
    if (categories.length === 0) return

    const list = categoriesRef.current
    if (list.length === 0) return

    const compute = () => {
      if (Date.now() < programmaticUntil.current) return

      const activationY = activationOffsetPx
      const first = list[0]
      if (first === undefined) return

      let next = first
      for (const cat of list) {
        const el = document.getElementById(priceCategorySectionId(cat))
        if (!el) continue
        const top = el.getBoundingClientRect().top
        if (top <= activationY) next = cat
        else break
      }
      setActiveId((prev) => (prev === next ? prev : next))
    }

    const onScroll = () => {
      requestAnimationFrame(compute)
    }

    const observer = new IntersectionObserver(onScroll, {
      root: null,
      rootMargin: '0px',
      threshold: [0, 0.05, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95, 1],
    })

    for (const cat of list) {
      const el = document.getElementById(priceCategorySectionId(cat))
      if (el) observer.observe(el)
    }

    const scrollRoot = document.scrollingElement ?? document.documentElement

    window.addEventListener('scroll', onScroll, {
      passive: true,
      capture: true,
    })
    scrollRoot.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    requestAnimationFrame(compute)

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll, true)
      scrollRoot.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [categoriesKey, categories.length, activationOffsetPx])

  const scrollToCategory = useCallback(
    (category: string) => {
      const el = document.getElementById(priceCategorySectionId(category))
      if (!el) return
      lockProgrammatic()
      setActiveId(category)
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [lockProgrammatic],
  )

  return { activeId, scrollToCategory }
}
