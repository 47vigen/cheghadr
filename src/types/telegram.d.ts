// Type declarations for the Telegram Web App JavaScript SDK
// loaded via <script src="https://telegram.org/js/telegram-web-app.js">

interface TelegramWebApp {
  initData: string
  initDataUnsafe: Record<string, unknown>
  colorScheme: 'light' | 'dark'
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    link_color?: string
    button_color?: string
    button_text_color?: string
    secondary_bg_color?: string
  }
  expand(): void
  close(): void
  ready(): void
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
}

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
  Telegram?: {
    WebApp?: TelegramWebApp
  }
  onTelegramAuth?: (user: TelegramWidgetUser) => void
}
