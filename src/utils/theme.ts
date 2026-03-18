export type AppTheme = 'light' | 'dark'

export function normalizeTheme(theme: string | null | undefined): AppTheme {
  return theme === 'dark' ? 'dark' : 'light'
}

export function getSystemTheme(): AppTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function resolveRuntimeTheme(
  telegramColorScheme: string | undefined,
): AppTheme {
  return telegramColorScheme
    ? normalizeTheme(telegramColorScheme)
    : getSystemTheme()
}

export function applyTheme(theme: AppTheme): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}
