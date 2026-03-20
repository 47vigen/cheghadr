import { isTelegramWebApp } from '@/utils/telegram'

export function downloadCSV(csv: string, filename: string) {
  // UTF-8 BOM ensures Excel correctly interprets the encoding (important for Persian text)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  if (isTelegramWebApp()) {
    try {
      const tg = (window as Window & { Telegram?: { WebApp?: { openLink?: (url: string) => void } } }).Telegram
      tg?.WebApp?.openLink?.(url)
    } catch {
      triggerDownload(url, filename)
    }
  } else {
    triggerDownload(url, filename)
  }
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
