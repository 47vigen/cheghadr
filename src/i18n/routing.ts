export const routing = {
  locales: ['en', 'fa'] as const,
  defaultLocale: 'en' as const,
}

export type Locale = (typeof routing.locales)[number]
