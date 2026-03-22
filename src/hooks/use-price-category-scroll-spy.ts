'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { priceCategorySectionId } from '@/lib/prices/anchors'

/**
 * Scroll spy for document/window scrolling. Uses a viewport-fixed horizontal scan line
 * (activationOffsetPx from the top of the viewport), so active category updates while
 * scrolling. Do not anchor the line to `main.getBoundingClientRect()` when the window
 * scrolls — that keeps section offset from main’s top constant and breaks the spy.
 */
export function usePriceCategoryScrollSpy(
  categories: string[],
  /** Distance from viewport top to the scan line (px); place below sticky category chips. */
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

  useEffect(() => {
    if (categories.length === 0) return

    let raf = 0

    const update = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (Date.now() < programmaticUntil.current) return

        const list = categoriesRef.current
        if (list.length === 0) return

        const first = list[0]
        if (first === undefined) return

        const activationY = activationOffsetPx
        let next = first
        for (const cat of list) {
          const el = document.getElementById(priceCategorySectionId(cat))
          if (!el) continue
          const top = el.getBoundingClientRect().top
          if (top <= activationY) next = cat
          else break
        }
        setActiveId((prev) => (prev === next ? prev : next))
      })
    }

    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      cancelAnimationFrame(raf)
    }
  }, [categories.length, activationOffsetPx])

  const scrollToCategory = useCallback(
    (category: string) => {
      const el = document.getElementById(priceCategorySectionId(category))
      if (!el) return
      lockProgrammatic()
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [lockProgrammatic],
  )

  return { activeId, scrollToCategory }
}
