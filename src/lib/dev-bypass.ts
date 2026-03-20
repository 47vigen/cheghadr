/** Development-only Telegram user impersonation (never on Vercel). */
export function isDevTelegramBypassAllowed(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    !process.env.VERCEL &&
    Boolean(process.env.DEV_TELEGRAM_USER_ID)
  )
}
