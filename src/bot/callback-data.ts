/** Encode callback_data parts into a colon-separated string (max 64 bytes). */
export function cb(...parts: (string | number)[]): string {
  return parts.join(':')
}

// Callback data constants
export const CB = {
  HOME: 'h',

  PORTFOLIO_BREAKDOWN: 'p:b',
  PORTFOLIO_ASSETS: 'p:a',

  PRICES_CATEGORIES: 'pr:c',
  pricesPage: (cat: string, page: number) => cb('pr', 'p', cat, page),

  ALERTS_LIST: 'al:l',

  SETTINGS_VIEW: 's:v',
  SETTINGS_LOCALE_FA: 's:lf',
  SETTINGS_LOCALE_EN: 's:le',
  SETTINGS_TOGGLE_DIGEST: 's:d',
} as const
