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

  // Build optimizations
  compress: true,
  generateEtags: false,
  cacheComponents: true,
  poweredByHeader: false,

  experimental: {
    cssChunking: true,
    optimizeServerReact: true,
    optimizePackageImports: [
      'date-fns',
      'lodash-es',
      '@base-ui/react',
      'date-fns-jalali',
      '@tabler/icons-react',
      '@telegram-apps/telegram-ui',
    ],
  },
}

export default nextConfig
