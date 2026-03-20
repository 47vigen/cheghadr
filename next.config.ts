import type { NextConfig } from 'next'

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import './src/env.js'

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  devIndicators: false,
  reactStrictMode: true,
  cacheComponents: true,

  // Build optimizations
  compress: true,
  generateEtags: false,
  poweredByHeader: false,

  experimental: {
    cssChunking: true,
    optimizeServerReact: true,
    optimizePackageImports: [
      '@base-ui/react',
      '@tabler/icons-react',
      '@heroui/react',
      'recharts',
    ],
  },
  headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' https://telegram.org; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https: wss:; frame-src https://telegram.org; object-src 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ]
  },
}

export default nextConfig
