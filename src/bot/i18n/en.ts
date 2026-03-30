const en = {
  bot: {
    welcome:
      '👋 Welcome to <b>Cheghadr?</b>\nUse the buttons below to navigate:',
    notRegistered:
      '⚠️ Please sign in through the app first before using the bot.',
    mainMenu: {
      title: '📱 <b>Cheghadr?</b>',
    },
    nav: {
      prices: '📊 Prices',
      alerts: '🔔 Alerts',
      settings: '⚙️ Settings',
      openApp: '🚀 Open Cheghadr',
      back: '🔙 Back',
      breakdown: '📂 Breakdown',
      assets: '🏦 Assets',
    },
    portfolio: {
      noData:
        '📭 No data to display.\nAdd assets through the app to get started.',
      homeTotal: 'Total value: <b>{value}</b> Toman',
      homeChangeHeading: '<b>Change</b> (vs last saved prices):',
      homeDeltaRow:
        '{label}: <b>{signIrt}{irt}</b> ({signPct}{pct}{pctSuffix})',
      homeStale: '⚠️ Quotes are about <b>{minutes}</b> minutes old.',
      homeStaleUnknown: '⚠️ No recent price snapshot.',
      window1D: '1D',
      window1W: '1W',
      window1M: '1M',
      windowALL: 'All time',
      breakdownTitle: '📂 <b>Portfolio Breakdown</b>',
      breakdownTotal: '💰 Total: <b>{value}</b>',
    },
    prices: {
      selectCategory: '📊 <b>Prices</b>\nSelect a category:',
      noData: '📭 No prices available. Please try again later.',
      pageTitle: '{cat}\nPage {n} of {total}',
      prev: '⬅️ Prev',
      next: 'Next ➡️',
      backToCategories: '🔙 Categories',
    },
    alerts: {
      listTitle: '🔔 <b>My Alerts</b>',
      noAlerts: '📭 You have no alerts yet.\nManage alerts in the app.',
      manageInApp: '⚙️ Manage Alerts in App',
      dirAbove: 'above',
      dirBelow: 'below',
      labelPrice: '📈 {name}  {dir} {threshold} Toman',
      labelPortfolio: '💼 Portfolio  {dir} {threshold} Toman',
      statusActive: '✅',
      statusPaused: '⏸️',
    },
    assets: {
      listTitle: '🏦 <b>My Assets</b>',
      noAssets: '📭 You have no assets yet.\nAdd assets through the app.',
      addInApp: '➕ Add Asset in App',
    },
    settings: {
      title: '⚙️ <b>Settings</b>',
      language: 'Language:',
      localeFa: '🇮🇷 Persian',
      localeEn: '🇺🇸 English',
      checkmark: ' ✅',
      digest: 'Daily digest:',
      digestEnabled: '✅ Enabled',
      digestDisabled: '⏸️ Disabled',
    },
  },
  category: {
    CURRENCY: '💵 Currency',
    CRYPTOCURRENCY: '🪙 Crypto',
    GOLD: '🥇 Gold',
    COIN: '🏅 Coin',
    SILVER: '🥈 Silver',
    BORS: '🏢 Stocks',
    GOLD_FUNDS: '🏦 Gold Funds',
    STOCK_FUNDS: '📊 Stock Funds',
    FIXED_INCOME_FUNDS: '🏛 Fixed Income Funds',
    MIXED_ASSET_FUNDS: '🔀 Mixed Funds',
    LEVERAGED_FUNDS: '⚡ Leveraged Funds',
    SECTOR_FUNDS: '🏗 Sector Funds',
    PROPERTY_FUNDS: '🏘 Property Funds',
    COMMODITY_SAFFRON_FUNDS: '🌸 Saffron Funds',
    OTHER: '📦 Other',
  },
} as const

export default en
