import { getIntlLocale } from '@/lib/prices'

function getDeepLink(): string {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? ''
  return `https://t.me/${botUsername}/app`
}

/** Locale for Telegram HTML notification copy (persisted on User). */
export type AlertMessageLocale = 'en' | 'fa'

function formatThreshold(
  thresholdIRT: string,
  locale: AlertMessageLocale,
): string {
  const n = Number(thresholdIRT)
  if (Number.isNaN(n)) return thresholdIRT
  return new Intl.NumberFormat(getIntlLocale(locale)).format(Math.round(n))
}

export function priceAlertMessage(
  assetDisplayName: string,
  direction: 'ABOVE' | 'BELOW',
  thresholdIRT: string,
  locale: AlertMessageLocale,
): string {
  const threshold = formatThreshold(thresholdIRT, locale)
  if (locale === 'en') {
    const dir = direction === 'ABOVE' ? 'rose above' : 'fell below'
    return (
      `🔔 <b>Price alert</b>\n\n` +
      `<b>${assetDisplayName}</b> ${dir} <code>${threshold}</code> Toman.\n\n` +
      `📲 <a href="${getDeepLink()}">Open Cheghadr</a>`
    )
  }
  const directionText = direction === 'ABOVE' ? 'از' : 'به زیر'
  return (
    `🔔 <b>هشدار قیمت</b>\n\n` +
    `قیمت <b>${assetDisplayName}</b> ${directionText} <code>${threshold}</code> تومان عبور کرد.\n\n` +
    `📲 <a href="${getDeepLink()}">مشاهده در چه‌قدر؟</a>`
  )
}

export function portfolioAlertMessage(
  direction: 'ABOVE' | 'BELOW',
  thresholdIRT: string,
  locale: AlertMessageLocale,
): string {
  const threshold = formatThreshold(thresholdIRT, locale)
  if (locale === 'en') {
    const dir = direction === 'ABOVE' ? 'rose above' : 'fell below'
    return (
      `🔔 <b>Portfolio alert</b>\n\n` +
      `Your portfolio value ${dir} <code>${threshold}</code> Toman.\n\n` +
      `📲 <a href="${getDeepLink()}">Open Cheghadr</a>`
    )
  }
  const directionText = direction === 'ABOVE' ? 'از' : 'به زیر'
  return (
    `🔔 <b>هشدار سبد دارایی</b>\n\n` +
    `ارزش سبد شما ${directionText} <code>${threshold}</code> تومان عبور کرد.\n\n` +
    `📲 <a href="${getDeepLink()}">مشاهده در چه‌قدر؟</a>`
  )
}

export function dailyDigestMessage(
  deltaPct: string,
  topMoverName: string,
  locale: AlertMessageLocale,
): string {
  const pctNum = Number(deltaPct)
  const sign = pctNum >= 0 ? '+' : ''
  const pctFormatted = new Intl.NumberFormat(getIntlLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pctNum)

  if (locale === 'en') {
    const moverText = topMoverName
      ? `Largest holding: <b>${topMoverName}</b>\n`
      : ''
    return (
      `📊 <b>Daily summary</b>\n\n` +
      `24h change: <b>${sign}${pctFormatted}%</b>\n` +
      moverText +
      `\n📲 <a href="${getDeepLink()}">Open Cheghadr</a>`
    )
  }

  const moverText = topMoverName
    ? `بزرگ‌ترین دارایی: <b>${topMoverName}</b>\n`
    : ''

  return (
    `📊 <b>خلاصه روزانه</b>\n\n` +
    `تغییر ۲۴ ساعته: <b>${sign}${pctFormatted}٪</b>\n` +
    moverText +
    `\n📲 <a href="${getDeepLink()}">مشاهده در چه‌قدر؟</a>`
  )
}
