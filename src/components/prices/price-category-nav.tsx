'use client'

import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

import { knownCategories } from '@/lib/prices'

interface PriceCategoryNavProps {
  categories: string[]
  activeId: string
  onSelect: (category: string) => void
}

/**
 * Sticky horizontal category strip: tap to scroll, mirrors scroll position for active state.
 */
export function PriceCategoryNav({
  categories,
  activeId,
  onSelect,
}: PriceCategoryNavProps) {
  const tCat = useTranslations('categories')
  const stripRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!activeId || !stripRef.current) return
    const btn = stripRef.current.querySelector<HTMLElement>(
      `[data-category="${CSS.escape(activeId)}"]`,
    )
    btn?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [activeId])

  if (categories.length === 0) return null

  return (
    <nav
      className={clsx(
        'sticky z-20 -mx-[var(--page-px)] border-border/80 border-b bg-background/90 px-[var(--page-px)] py-2 backdrop-blur-md',
        'top-0',
      )}
      aria-label="Price categories"
    >
      <div
        ref={stripRef}
        className={clsx(
          'flex max-w-full flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {categories.map((category) => {
          const label = knownCategories.has(category)
            ? tCat(category as Parameters<typeof tCat>[0])
            : category
          const isActive = category === activeId
          return (
            <button
              key={category}
              type="button"
              data-category={category}
              onClick={() => onSelect(category)}
              className={clsx(
                'shrink-0 rounded-sm border px-3 py-1.5 font-[family-name:var(--font-display)] text-[0.65rem] uppercase tracking-[0.08em] transition-[background-color,border-color,color,transform] duration-[var(--motion-duration-fast)]',
                isActive
                  ? 'border-accent bg-accent text-accent-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground active:scale-[0.98]',
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
