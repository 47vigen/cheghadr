import type { MetadataRoute } from 'next'

/**
 * Web App Manifest for PWA support.
 * Used when the app is opened in a standalone browser (not inside Telegram).
 * Theme colors match Telegram UI for consistency.
 * Add icon-192.png and icon-512.png to public/ for full PWA support.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Cheghadr?',
    short_name: 'Cheghadr',
    description:
      'Track your net worth in Iranian Toman. Monitor crypto, forex, gold and more — in Persian or English.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    lang: 'en',
    dir: 'ltr',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
