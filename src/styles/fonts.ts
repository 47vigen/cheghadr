import { JetBrains_Mono, Vazirmatn as VazirmatnFont } from 'next/font/google'

export const Vazirmatn = VazirmatnFont({
  subsets: ['arabic', 'latin'],
  variable: '--font-vazirmatn',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const JetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})
