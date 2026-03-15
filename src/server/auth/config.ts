import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

import { validateTelegramWidget } from './telegram'

export type { Session } from 'next-auth'

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

        const valid = validateTelegramWidget(
          credentials as Record<string, unknown>,
          process.env.TELEGRAM_BOT_TOKEN,
        )

        if (!valid) return null

        // Store only telegramUserId — no PII
        return {
          id: String(credentials.id),
        }
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
