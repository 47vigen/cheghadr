const fa = {
  bot: {
    welcome:
      '👋 به ربات <b>چه‌قدر؟</b> خوش آمدید.\nاز دکمه‌های زیر استفاده کنید:',
    notRegistered: '⚠️ برای استفاده از ربات ابتدا از طریق اپلیکیشن وارد شوید.',
    mainMenu: {
      title: '📱 <b>چه‌قدر؟</b>',
    },
    nav: {
      prices: '📊 قیمت‌ها',
      alerts: '🔔 هشدارها',
      settings: '⚙️ تنظیمات',
      openApp: '🚀 باز کردن چه‌قدر؟',
      back: '🔙 بازگشت',
      breakdown: '📂 ترکیب سبد',
      assets: '🏦 دارایی‌ها',
    },
    portfolio: {
      noData:
        '📭 اطلاعاتی برای نمایش وجود ندارد.\nدارایی‌های خود را از طریق اپ اضافه کنید.',
      homeTotal: 'ارزش کل: <b>{value}</b> تومان',
      homeChangeHeading: '<b>تغییر</b> (نسبت به آخرین ذخیرهٔ قیمت‌ها):',
      homeDeltaRow:
        '{label}: <b>{signIrt}{irt}</b> ({signPct}{pct}{pctSuffix})',
      homeStale: '⚠️ قیمت‌ها حدود <b>{minutes}</b> دقیقه قدیمی هستند.',
      homeStaleUnknown: '⚠️ اسنپ‌شات قیمت تازه‌ای در دسترس نیست.',
      window1D: '۱ روز',
      window1W: '۱ هفته',
      window1M: '۱ ماه',
      windowALL: 'کل دوره',
      breakdownTitle: '📂 <b>ترکیب سبد</b>',
      breakdownTotal: '💰 جمع کل: <b>{value}</b>',
    },
    prices: {
      selectCategory: '📊 <b>قیمت‌ها</b>\nیک دسته‌بندی انتخاب کنید:',
      noData: '📭 قیمتی در دسترس نیست. کمی بعد دوباره امتحان کنید.',
      pageTitle: '{cat}\nصفحه {n} از {total}',
      prev: '⬅️ قبلی',
      next: 'بعدی ➡️',
      backToCategories: '🔙 دسته‌بندی‌ها',
    },
    alerts: {
      listTitle: '🔔 <b>هشدارهای من</b>',
      noAlerts: '📭 هنوز هشداری ندارید.\nمدیریت هشدارها در اپ.',
      manageInApp: '⚙️ مدیریت هشدارها در اپ',
      dirAbove: 'بالای',
      dirBelow: 'زیر',
      labelPrice: '📈 {name}  {dir} {threshold} تومان',
      labelPortfolio: '💼 سبد  {dir} {threshold} تومان',
      statusActive: '✅',
      statusPaused: '⏸️',
    },
    assets: {
      listTitle: '🏦 <b>دارایی‌های من</b>',
      noAssets:
        '📭 هنوز دارایی‌ای ندارید.\nدارایی‌های خود را از طریق اپ اضافه کنید.',
      addInApp: '➕ افزودن دارایی در اپ',
    },
    settings: {
      title: '⚙️ <b>تنظیمات</b>',
      language: 'زبان:',
      localeFa: '🇮🇷 فارسی',
      localeEn: '🇺🇸 English',
      checkmark: ' ✅',
      digest: 'خلاصه روزانه:',
      digestEnabled: '✅ فعال',
      digestDisabled: '⏸️ غیرفعال',
    },
  },
  category: {
    CURRENCY: '💵 ارز',
    CRYPTOCURRENCY: '🪙 رمزارز',
    GOLD: '🥇 طلا',
    COIN: '🏅 سکه',
    SILVER: '🥈 نقره',
    BORS: '🏢 بورس',
    GOLD_FUNDS: '🏦 صندوق طلا',
    STOCK_FUNDS: '📊 صندوق سهام',
    FIXED_INCOME_FUNDS: '🏛 صندوق درآمد ثابت',
    MIXED_ASSET_FUNDS: '🔀 صندوق مختلط',
    LEVERAGED_FUNDS: '⚡ صندوق اهرمی',
    SECTOR_FUNDS: '🏗 صندوق بخشی',
    PROPERTY_FUNDS: '🏘 صندوق زمین',
    COMMODITY_SAFFRON_FUNDS: '🌸 صندوق زعفران',
    OTHER: '📦 سایر',
  },
} as const

export default fa
