import en from './en'
import fa from './fa'

export type BotLocale = 'en' | 'fa'

type NestedRecord = { [key: string]: string | NestedRecord }

/**
 * Resolve a dot-separated key path inside a nested object.
 * e.g. t('fa', 'bot.nav.back') → '↩️ بازگشت'
 */
export function t(
  locale: BotLocale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const dict: NestedRecord = locale === 'fa' ? fa : en

  let val: string | NestedRecord | undefined = dict
  for (const part of key.split('.')) {
    if (typeof val !== 'object' || val === null) {
      val = undefined
      break
    }
    val = (val as NestedRecord)[part]
  }

  let str = typeof val === 'string' ? val : key

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replaceAll(`{${k}}`, String(v))
    }
  }

  return str
}

/** Category label in the user's locale. Falls back to raw symbol. */
export function tCategory(locale: BotLocale, categorySymbol: string): string {
  const key = `category.${categorySymbol}`
  const result = t(locale, key)
  return result === key ? categorySymbol : result
}
