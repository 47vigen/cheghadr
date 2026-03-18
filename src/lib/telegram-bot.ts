interface SendResult {
  success: boolean
  messageId?: number
  error?: string
}

interface TelegramSendMessageResponse {
  ok: boolean
  result?: { message_id: number }
  description?: string
}

async function sendBotMessage(
  telegramUserId: bigint,
  text: string,
): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' }
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramUserId.toString(),
          text,
          parse_mode: 'HTML',
        }),
      },
    )

    const json = (await response.json()) as TelegramSendMessageResponse

    if (!json.ok) {
      return {
        success: false,
        error: json.description ?? `Telegram API error: ${response.status}`,
      }
    }

    return { success: true, messageId: json.result?.message_id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown fetch error',
    }
  }
}

export async function sendBotMessageWithRetry(
  telegramUserId: bigint,
  text: string,
): Promise<SendResult> {
  const first = await sendBotMessage(telegramUserId, text)
  if (first.success) return first

  // One retry after 2-second delay
  await new Promise((resolve) => setTimeout(resolve, 2000))
  const second = await sendBotMessage(telegramUserId, text)

  if (!second.success) {
    console.error(
      `[BOT] Failed to deliver to ${telegramUserId}: ${second.error}`,
    )
  }

  return second
}
