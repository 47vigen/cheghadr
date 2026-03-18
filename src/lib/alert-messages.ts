function getDeepLink(): string {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? ''
  return `https://t.me/${botUsername}/app`
}

function formatThreshold(thresholdIRT: string): string {
  const n = Number(thresholdIRT)
  if (Number.isNaN(n)) return thresholdIRT
  return new Intl.NumberFormat('fa-IR').format(Math.round(n))
}

export function priceAlertMessage(
  assetNameFa: string,
  direction: 'ABOVE' | 'BELOW',
  thresholdIRT: string,
): string {
  const directionText = direction === 'ABOVE' ? 'از' : 'به زیر'
  const threshold = formatThreshold(thresholdIRT)

  return (
    `🔔 <b>هشدار قیمت</b>\n\n` +
    `قیمت <b>${assetNameFa}</b> ${directionText} <code>${threshold}</code> تومان عبور کرد.\n\n` +
    `📲 <a href="${getDeepLink()}">مشاهده در چه‌قدر؟</a>`
  )
}

export function portfolioAlertMessage(
  direction: 'ABOVE' | 'BELOW',
  thresholdIRT: string,
): string {
  const directionText = direction === 'ABOVE' ? 'از' : 'به زیر'
  const threshold = formatThreshold(thresholdIRT)

  return (
    `🔔 <b>هشدار سبد دارایی</b>\n\n` +
    `ارزش سبد شما ${directionText} <code>${threshold}</code> تومان عبور کرد.\n\n` +
    `📲 <a href="${getDeepLink()}">مشاهده در چه‌قدر؟</a>`
  )
}

export function dailyDigestMessage(
  deltaPct: string,
  topMoverName: string,
): string {
  const pctNum = Number(deltaPct)
  const sign = pctNum >= 0 ? '+' : ''
  const pctFormatted = new Intl.NumberFormat('fa-IR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(pctNum)
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
