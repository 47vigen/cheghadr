;(() => {
  // First paint only. Runtime updates are handled by TelegramProvider.
  let theme = 'dark'
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.colorScheme) {
    theme = window.Telegram.WebApp.colorScheme === 'dark' ? 'dark' : 'light'
  } else if (typeof window !== 'undefined') {
    const m = window.matchMedia('(prefers-color-scheme: dark)')
    theme = m.matches ? 'dark' : 'light'
  }
  document.documentElement.setAttribute('data-theme', theme)
})()
