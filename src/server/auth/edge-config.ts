// Edge-safe auth configuration.
// Does NOT import any Node.js modules (no crypto, no fs, etc.)
// Used by middleware which runs in the Edge Runtime.
// The full config (with Credentials provider + Telegram validation) is in config.ts.

export const edgeAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  providers: [] as [],
} as const
