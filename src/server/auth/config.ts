import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

import { validateInitData, validateTelegramWidget } from './telegram'

export type { Session } from 'next-auth'

const TELEGRAM_WIDGET_FIELDS = [
  'id',
  'first_name',
  'last_name',
  'username',
  'photo_url',
  'auth_date',
  'hash',
] as const

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      id: 'telegram',
      name: 'Telegram',
      credentials: {
        id: { label: 'ID' },
        first_name: { label: 'First name' },
        last_name: { label: 'Last name' },
        username: { label: 'Username' },
        photo_url: { label: 'Photo URL' },
        auth_date: { label: 'Auth date' },
        hash: { label: 'Hash' },
      },
      authorize(credentials) {
        if (!credentials || !process.env.TELEGRAM_BOT_TOKEN) return null

        // NextAuth injects extra fields (csrfToken, etc.) into credentials.
        // Extract only Telegram-specific fields to prevent HMAC mismatch.
        const raw = credentials as Record<string, unknown>
        const telegramData: Record<string, unknown> = {}
        for (const key of TELEGRAM_WIDGET_FIELDS) {
          if (raw[key] != null) telegramData[key] = raw[key]
        }

        const valid = validateTelegramWidget(
          telegramData,
          process.env.TELEGRAM_BOT_TOKEN,
        )

        if (!valid) return null

        return { id: String(credentials.id) }
      },
    }),

    Credentials({
      id: 'telegram-miniapp',
      name: 'Telegram Mini App',
      credentials: {
        initData: { label: 'Init Data' },
      },
      authorize(credentials) {
        if (!credentials?.initData || !process.env.TELEGRAM_BOT_TOKEN)
          return null

        const result = validateInitData(
          String(credentials.initData),
          process.env.TELEGRAM_BOT_TOKEN,
        )

        if (!result.valid || !result.user) return null

        return { id: String(result.user.id) }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.telegramUserId = user.id
      }
      return token
    },
    session({ session, token }) {
      return {
        ...session,
        telegramUserId: token.telegramUserId as string | undefined,
      }
    },
  },
  pages: {
    signIn: '/login',
  },
})
