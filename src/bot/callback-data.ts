/** Encode callback_data parts into a colon-separated string (max 64 bytes). */
export function cb(...parts: (string | number)[]): string {
  return parts.join(':')
}

/** Decode callback_data back into parts. */
export function parseCb(data: string): string[] {
  return data.split(':')
}

// Callback data constants
export const CB = {
  HOME: 'h',

  PORTFOLIO_VIEW: 'p:v',
  PORTFOLIO_BREAKDOWN: 'p:b',
  PORTFOLIO_ASSETS: 'p:a',

  PRICES_CATEGORIES: 'pr:c',
  pricesPage: (cat: string, page: number) => cb('pr', 'p', cat, page),

  ALERTS_LIST: 'al:l',
  alertToggle: (id: string) => cb('al', 't', id),
  alertDeleteConfirm: (id: string) => cb('al', 'dc', id),
  alertDeleteYes: (id: string) => cb('al', 'dy', id),
  ALERT_NEW_PRICE: 'al:np',
  ALERT_NEW_PORTFOLIO: 'al:nq',

  SETTINGS_VIEW: 's:v',
  SETTINGS_LOCALE_FA: 's:lf',
  SETTINGS_LOCALE_EN: 's:le',
  SETTINGS_TOGGLE_DIGEST: 's:d',

  ASSET_ADD: 'as:a',
  assetDeleteConfirm: (id: string) => cb('as', 'dc', id),
  assetDeleteYes: (id: string) => cb('as', 'dy', id),

  // Wizard-internal callbacks (used inside conversations)
  wizardCategory: (cat: string) => cb('wz', 'c', cat),
  wizardAsset: (symbol: string) => cb('wz', 'a', symbol),
  wizardPageNext: (cat: string, page: number) => cb('wz', 'n', cat, page),
  wizardPagePrev: (cat: string, page: number) => cb('wz', 'p', cat, page),
  wizardDirectionAbove: 'wz:d:ABOVE',
  wizardDirectionBelow: 'wz:d:BELOW',
  wizardPortfolio: (id: string) => cb('wz', 'pf', id),
  WIZARD_CANCEL: 'wz:x',
} as const
