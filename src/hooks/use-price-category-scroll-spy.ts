'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { priceCategorySectionId } from '@/lib/prices/anchors'

const MAIN_SELECTOR = 'main'

export function usePriceCategoryScrollSpy(
  categories: string[],
  activationOffsetPx = 72,
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
    const main = document.querySelector(MAIN_SELECTOR)
    if (!main || categories.length === 0) return

    let raf = 0

    const update = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (Date.now() < programmaticUntil.current) return

        const list = categoriesRef.current
        if (list.length === 0) return

        const first = list[0]
        if (first === undefined) return

        // Document scroll: activation line moves with <main>’s top edge + offset (viewport coords).
        const activationY = main.getBoundingClientRect().top + activationOffsetPx
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
    const ro = new ResizeObserver(update)
    ro.observe(main)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      ro.disconnect()
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
