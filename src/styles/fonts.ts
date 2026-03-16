import { Vazirmatn as VazirmatnFont } from 'next/font/google'

export const Vazirmatn = VazirmatnFont({
  subsets: ['arabic'],
  variable: '--font-vazirmatn',
  display: 'swap',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
})
