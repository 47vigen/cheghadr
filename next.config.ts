import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  output: 'standalone',
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
    ],
  },
}

export default nextConfig
