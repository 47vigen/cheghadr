import { retrieveRawInitData } from '@telegram-apps/sdk'
import WebApp from '@twa-dev/sdk'

/**
 * Returns raw Telegram Mini App initData string for auth.
 * Tries @telegram-apps/sdk first, falls back to @twa-dev/sdk.
 * Returns undefined when not in a browser or no Telegram context.
 */
export function getRawInitData(): string | undefined {
  if (typeof window === 'undefined') return undefined

  try {
    const raw = retrieveRawInitData()
    if (raw) return raw
  } catch {
    // SDK throws when no Telegram context is found — fall through
  }

  return WebApp.initData || undefined
}

/**
 * Returns true when running inside a Telegram Mini App with a MainButton
 * available. Used to decide whether to show the native MainButton or fall
 * back to an inline button.
 */
export function isTelegramWebApp(): boolean {
  if (typeof window === 'undefined') return false
  return !!WebApp.MainButton
}
