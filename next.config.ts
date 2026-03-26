import type { NextConfig } from 'next'

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import './src/env.js'

const nextConfig: NextConfig = {
  compress: true,
  typedRoutes: true,
  reactCompiler: true,
  devIndicators: false,
  reactStrictMode: true,
  cacheComponents: true,

  // Logging
  logging: {
    browserToTerminal: true,
  },

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
}

export default nextConfig
