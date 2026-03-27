/** Returns the text direction for the given locale. */
export function getDir(locale: string): 'rtl' | 'ltr' {
  return locale === 'fa' ? 'rtl' : 'ltr'
}
