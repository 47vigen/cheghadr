import crypto from 'node:crypto'

export interface TelegramUser {
  id: number
  first_name?: string
  username?: string
}

export interface InitDataValidationResult {
  valid: boolean
  user?: TelegramUser
}

/**
 * Validates Telegram Mini App initData via HMAC-SHA256.
 * Implements the official validation algorithm:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(
  initData: string,
  botToken: string,
): InitDataValidationResult {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return { valid: false }

  params.delete('hash')

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest()

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  // Constant-time comparison to prevent timing attacks
  if (
    calculatedHash.length !== hash.length ||
    !crypto.timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(hash))
  ) {
    return { valid: false }
  }

  // Reject tokens older than 1 hour to prevent replay attacks
  const authDate = Number(params.get('auth_date'))
  const now = Math.floor(Date.now() / 1000)
  if (Number.isNaN(authDate) || now - authDate > 3600) return { valid: false }

  const userStr = params.get('user')
  if (!userStr) return { valid: false }

  try {
    const user = JSON.parse(userStr) as TelegramUser
    // Ensure id is a valid integer before returning
    if (typeof user.id !== 'number' || !Number.isInteger(user.id)) {
      return { valid: false }
    }
    return { valid: true, user: { id: user.id } }
  } catch {
    return { valid: false }
  }
}

/**
 * Validates Telegram Login Widget data.
 * Telegram recommends rejecting tokens older than 24 hours.
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function validateTelegramWidget(
  data: Record<string, unknown>,
  botToken: string,
): boolean {
  const { hash, ...rest } = data
  if (typeof hash !== 'string') return false

  // Reject widget data older than 24 hours to prevent replay attacks
  const authDate = Number(rest.auth_date)
  const now = Math.floor(Date.now() / 1000)
  if (Number.isNaN(authDate) || now - authDate > 86400) return false

  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('\n')

  const secretKey = crypto.createHash('sha256').update(botToken).digest()

  const hmac = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex')

  // Constant-time comparison to prevent timing attacks
  return (
    hmac.length === hash.length &&
    crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(hash))
  )
}
