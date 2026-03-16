// Type declarations for the Telegram Web App JavaScript SDK
// loaded via <script src="https://telegram.org/js/telegram-web-app.js">

interface TelegramWidgetUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

interface Window {
  onTelegramAuth?: (user: TelegramWidgetUser) => void
}
