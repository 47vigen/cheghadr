import type { BiggestMover } from '@/lib/portfolio-utils'
import { formatIRT, getIntlLocale } from '@/lib/prices'

function getDeepLink(): string {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? ''
  return `https://t.me/${botUsername}/app`
}

export function getOpenAppReplyMarkup(locale: AlertMessageLocale): object {
  const text =
    locale === 'en' ? '📲 Open Cheghadr' : '📲 مشاهده در چه‌قدر؟'
  return { inline_keyboard: [[{ text, url: getDeepLink() }]] }
}

/** Locale for Telegram HTML notification copy (persisted on User). */
export type AlertMessageLocale = 'en' | 'fa'

export function toAlertMessageLocale(loc: 'en' | 'fa'): AlertMessageLocale {
  return loc === 'en' ? 'en' : 'fa'
}

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

interface DailyDigestOpts {
  totalIRT?: number
  deltaIRT?: number
  biggestMover?: BiggestMover | null
}

export function dailyDigestMessage(
  deltaPct: string,
  topHoldingName: string,
  locale: AlertMessageLocale,
  opts?: DailyDigestOpts,
): string {
  const pctNum = Number(deltaPct)
  const sign = pctNum >= 0 ? '+' : ''
  const pctFormatted = new Intl.NumberFormat(getIntlLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pctNum)

  const { totalIRT, deltaIRT, biggestMover } = opts ?? {}

  if (locale === 'en') {
    const totalLine =
      totalIRT != null
        ? `💼 Total: <b>${formatIRT(totalIRT, locale)} Toman</b>\n`
        : ''
    const deltaAbsLine =
      deltaIRT != null
        ? ` (${deltaIRT >= 0 ? '+' : ''}${formatIRT(deltaIRT, locale)} Toman)`
        : ''
    const holdingLine = topHoldingName
      ? `Largest holding: <b>${topHoldingName}</b>\n`
      : ''
    const moverIcon = biggestMover
      ? biggestMover.isPositive
        ? '📈'
        : '📉'
      : ''
    const moverChangePct = biggestMover
      ? new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(biggestMover.changePct)
      : ''
    const moverLine = biggestMover
      ? `${moverIcon} Top mover: <b>${biggestMover.assetName}</b> ${biggestMover.isPositive ? '+' : ''}${moverChangePct}%\n`
      : ''
    return (
      `📊 <b>Daily summary</b>\n\n` +
      totalLine +
      `24h change: <b>${sign}${pctFormatted}%</b>${deltaAbsLine}\n` +
      holdingLine +
      moverLine
    ).trimEnd()
  }

  const totalLine =
    totalIRT != null
      ? `💼 ارزش کل: <b>${formatIRT(totalIRT, locale)} تومان</b>\n`
      : ''
  const deltaAbsLine =
    deltaIRT != null
      ? ` (${deltaIRT >= 0 ? '+' : ''}${formatIRT(deltaIRT, locale)} تومان)`
      : ''
  const holdingLine = topHoldingName
    ? `بزرگ‌ترین دارایی: <b>${topHoldingName}</b>\n`
    : ''
  const moverIcon = biggestMover
    ? biggestMover.isPositive
      ? '📈'
      : '📉'
    : ''
  const moverChangePct = biggestMover
    ? new Intl.NumberFormat('fa-IR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(biggestMover.changePct)
    : ''
  const moverLine = biggestMover
    ? `${moverIcon} بیشترین تغییر: <b>${biggestMover.assetName}</b> ${biggestMover.isPositive ? '+' : ''}${moverChangePct}٪\n`
    : ''
  return (
    `📊 <b>خلاصه روزانه</b>\n\n` +
    totalLine +
    `تغییر ۲۴ ساعته: <b>${sign}${pctFormatted}٪</b>${deltaAbsLine}\n` +
    holdingLine +
    moverLine
  ).trimEnd()
}
