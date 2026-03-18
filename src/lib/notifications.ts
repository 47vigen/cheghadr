import { sendBotMessageWithRetry } from '@/lib/telegram-bot'

const RATE_LIMIT_DELAY_MS = 35

interface QueuedNotification {
  telegramUserId: bigint
  text: string
  alertId: string
}

export class NotificationQueue {
  private queue: QueuedNotification[] = []

  enqueue(notification: QueuedNotification): void {
    this.queue.push(notification)
  }

  async drain(): Promise<{ sent: number; failed: number }> {
    let sent = 0
    let failed = 0

    for (const notification of this.queue) {
      const result = await sendBotMessageWithRetry(
        notification.telegramUserId,
        notification.text,
      )

      if (result.success) {
        sent++
      } else {
        failed++
      }

      // Rate limit: ~28 msg/sec, under Telegram's 30/sec limit
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS))
    }

    this.queue = []
    return { sent, failed }
  }
}
