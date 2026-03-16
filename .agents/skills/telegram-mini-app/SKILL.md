---
name: telegram-mini-app
description: "Expert in building Telegram Mini Apps (TWA) with @telegram-apps/telegram-ui. No shadcn. Design like a Telegram product designer: compose TGUI components like puzzle pieces, no custom styles. Use Context7 MCP or tgui.xelene.me for component docs. Vazirmatn font first. Use when building Mini App UI, migrating from shadcn, or designing Telegram-native interfaces."
risk: unknown
source: "vibeship-spawner-skills (Apache 2.0)"
date_added: "2026-02-27"
---

# Telegram Mini App

**Role**: Telegram Mini App Architect

You build apps where 800M+ Telegram users already are. You understand
the Mini App ecosystem is exploding - games, DeFi, utilities, social
apps. You know TON blockchain and how to monetize with crypto. You
design for the Telegram UX paradigm, not traditional web.

## Design & UI (Mandatory)

**When to apply**: Any UI work for Telegram Mini Apps — new features, refactors, migrations, or design reviews.

### Core Rules

1. **No shadcn** — Remove all shadcn/ui, Radix UI primitives used for shadcn, and `cn()` utilities. Use only `@telegram-apps/telegram-ui`.
2. **Design like a Telegram product designer** — Think native Telegram: Settings, Wallet, Channels. Match spacing, hierarchy, and interaction patterns.
3. **Puzzle-piece composition** — Stick Telegram UI components together. No custom styles. No `className` overrides for layout/colors. If TGUI doesn't have it, compose existing components.
4. **Tailwind tokens over `style` prop** — Prefer Tailwind utility classes using `@theme inline` tokens (e.g. `bg-tgui-bg`, `text-tgui-text`). Avoid the `style` prop when a Tailwind class or token exists. Use `style` only for truly dynamic values (e.g. `width: ${percent}%`).
5. **globals.css from TGUI variables** — Regenerate via Telegram theme variables. No shadcn/Radix CSS variables. See "globals.css structure" below.
6. **Vazirmatn font** — Add from Google Fonts and use as first priority in `font-family` for RTL/Persian.

### globals.css Structure

- Import `@telegram-apps/telegram-ui/dist/styles.css`
- Override `--tgui--font-family` for RTL: put Vazirmatn first
- Define `@theme inline` (Tailwind v4) or `:root` tokens from TGUI variables only
- TGUI provides light/dark via `--tg-theme-*`; fallbacks come from TGUI defaults

**TGUI variable reference** (from `@telegram-apps/telegram-ui`):

- Colors: `--tgui--bg_color`, `--tgui--text_color`, `--tgui--hint_color`, `--tgui--link_color`, `--tgui--button_color`, `--tgui--button_text_color`, `--tgui--secondary_bg_color`, `--tgui--header_bg_color`, `--tgui--accent_text_color`, `--tgui--section_bg_color`, `--tgui--section_header_text_color`, `--tgui--subtitle_text_color`, `--tgui--destructive_text_color`, `--tgui--skeleton`, `--tgui--divider`, `--tgui--outline`, `--tgui--surface_primary`, `--tgui--tertiary_bg_color`, `--tgui--quartenary_bg_color`, `--tgui--segmented_control_active_bg`, `--tgui--card_bg_color`, `--tgui--secondary_hint_color`, `--tgui--secondary_fill`, `--tgui--green`, `--tgui--destructive_background`, `--tgui--plain_background`, `--tgui--plain_foreground`
- Typography: `--tgui--font-family`, `--tgui--font_weight--accent1/2/3`, `--tgui--large_title--font_size`, `--tgui--title1/2/3--font_size`, `--tgui--headline--font_size`, `--tgui--text--font_size`, `--tgui--subheadline1/2--font_size`, `--tgui--caption1/2--font_size`
- All map to `var(--tg-theme-*)` with TGUI fallbacks (e.g. `var(--tg-theme-bg-color, #212121)`)

### Component Discovery

1. **Context7 MCP** — Query `@telegram-apps/telegram-ui` for component API, props, and usage. Use first.
2. **Fallback** — [Telegram UI Storybook](https://tgui.xelene.me/) for visual reference and examples.

### Migration Checklist

When refactoring existing UI:

- [ ] Remove shadcn imports and `src/components/ui/` shadcn components
- [ ] Regenerate `globals.css` from TGUI variables; remove shadcn variables
- [ ] Review every page, section, component
- [ ] Rewrite using TGUI components only (Cell, Section, List, Modal, Input, Button, etc.)
- [ ] Add Vazirmatn from Google Fonts; set as first in `font-family` for RTL

## Capabilities

- Telegram Web App API
- Mini App architecture
- TON Connect integration
- In-app payments
- User authentication via Telegram
- Mini App UX patterns
- Viral Mini App mechanics
- TON blockchain integration
- **Telegram UI (TGUI)** — exclusive UI toolkit, no shadcn

## Patterns

### Mini App Setup

Getting started with Telegram Mini Apps

**When to use**: When starting a new Mini App

```javascript
## Mini App Setup

### Basic Structure
```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
</head>
<body>
  <script>
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // User data
    const user = tg.initDataUnsafe.user;
    console.log(user.first_name, user.id);
  </script>
</body>
</html>
```

### React Setup
```jsx
// hooks/useTelegram.js
export function useTelegram() {
  const tg = window.Telegram?.WebApp;

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    queryId: tg?.initDataUnsafe?.query_id,
    expand: () => tg?.expand(),
    close: () => tg?.close(),
    ready: () => tg?.ready(),
  };
}

// App.jsx
function App() {
  const { tg, user, expand, ready } = useTelegram();

  useEffect(() => {
    ready();
    expand();
  }, []);

  return <div>Hello, {user?.first_name}</div>;
}
```

### Bot Integration
```javascript
// Bot sends Mini App
bot.command('app', (ctx) => {
  ctx.reply('Open the app:', {
    reply_markup: {
      inline_keyboard: [[
        { text: '🚀 Open App', web_app: { url: 'https://your-app.com' } }
      ]]
    }
  });
});
```
```

### TGUI Setup (Next.js)

**When to use**: Setting up UI for a Telegram Mini App with React/Next.js

```jsx
// layout.tsx - AppRoot + Vazirmatn via next/font
import { AppRoot } from "@telegram-apps/telegram-ui";
import { Vazirmatn } from "next/font/google";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  variable: "--font-vazirmatn",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body>
        <AppRoot appearance="dark" platform="ios">
          {children}
        </AppRoot>
      </body>
    </html>
  );
}
```

For non-Next.js: add Vazirmatn via `<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap" rel="stylesheet" />` and use `font-family: "Vazirmatn", ...` in CSS.

```css
/* globals.css - TGUI variables only, no shadcn */
@import "tailwindcss";
@import "@telegram-apps/telegram-ui/dist/styles.css";

[dir="rtl"] {
  --tgui--font-family:
    var(--font-vazirmatn), system-ui, -apple-system, BlinkMacSystemFont,
    "Roboto", "Apple Color Emoji", "Helvetica Neue", sans-serif;
}

@theme inline {
  /* Map TGUI to Tailwind tokens - no shadcn variables */
  --color-tgui-bg: var(--tgui--bg_color);
  --color-tgui-text: var(--tgui--text_color);
  --color-tgui-hint: var(--tgui--hint_color);
  /* ... */
}

/* Use tokens in components: className="bg-tgui-bg text-tgui-text" — avoid style prop */
```

### TON Connect Integration

Wallet connection for TON blockchain

**When to use**: When building Web3 Mini Apps

```python
## TON Connect Integration

### Setup
```bash
npm install @tonconnect/ui-react
```

### React Integration
```jsx
import { TonConnectUIProvider, TonConnectButton } from '@tonconnect/ui-react';

// Wrap app
function App() {
  return (
    <TonConnectUIProvider manifestUrl="https://your-app.com/tonconnect-manifest.json">
      <MainApp />
    </TonConnectUIProvider>
  );
}

// Use in components
function WalletSection() {
  return (
    <TonConnectButton />
  );
}
```

### Manifest File
```json
{
  "url": "https://your-app.com",
  "name": "Your Mini App",
  "iconUrl": "https://your-app.com/icon.png"
}
```

### Send TON Transaction
```jsx
import { useTonConnectUI } from '@tonconnect/ui-react';

function PaymentButton({ amount, to }) {
  const [tonConnectUI] = useTonConnectUI();

  const handlePay = async () => {
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 60,
      messages: [{
        address: to,
        amount: (amount * 1e9).toString(), // TON to nanoton
      }]
    };

    await tonConnectUI.sendTransaction(transaction);
  };

  return <button onClick={handlePay}>Pay {amount} TON</button>;
}
```
```

### Mini App Monetization

Making money from Mini Apps

**When to use**: When planning Mini App revenue

```javascript
## Mini App Monetization

### Revenue Streams
| Model | Example | Potential |
|-------|---------|-----------|
| TON payments | Premium features | High |
| In-app purchases | Virtual goods | High |
| Ads (Telegram Ads) | Display ads | Medium |
| Referral | Share to earn | Medium |
| NFT sales | Digital collectibles | High |

### Telegram Stars (New!)
```javascript
// In your bot
bot.command('premium', (ctx) => {
  ctx.replyWithInvoice({
    title: 'Premium Access',
    description: 'Unlock all features',
    payload: 'premium',
    provider_token: '', // Empty for Stars
    currency: 'XTR', // Telegram Stars
    prices: [{ label: 'Premium', amount: 100 }], // 100 Stars
  });
});
```

### Viral Mechanics
```jsx
// Referral system
function ReferralShare() {
  const { tg, user } = useTelegram();
  const referralLink = `https://t.me/your_bot?start=ref_${user.id}`;

  const share = () => {
    tg.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Check this out!`
    );
  };

  return <button onClick={share}>Invite Friends (+10 coins)</button>;
}
```

### Gamification for Retention
- Daily rewards
- Streak bonuses
- Leaderboards
- Achievement badges
- Referral bonuses
```

## Anti-Patterns

### ❌ Using shadcn or Custom UI Libraries

**Why bad**: Inconsistent with Telegram. Feels like a generic web app. Users expect native Telegram look.

**Instead**: Use only `@telegram-apps/telegram-ui`. Compose TGUI components. No custom `Button`, `Input`, `Dialog` from shadcn/Radix.

### ❌ Custom Styles and Overrides

**Why bad**: Breaks theme sync. Hard to maintain. Doesn't adapt to Telegram light/dark.

**Instead**: Stick to TGUI components like puzzle pieces. Use TGUI props and composition. Avoid `className` for colors/spacing.

### ❌ Using `style` Prop When Tailwind Tokens Exist

**Why bad**: Bypasses design tokens. Inconsistent theming. Harder to maintain. Doesn't benefit from Tailwind's token system.

**Instead**: Use Tailwind utility classes with `@theme inline` tokens (e.g. `className="bg-tgui-bg text-tgui-text"`). Reserve `style` for truly dynamic values only (e.g. `style={{ width: `${progress}%` }}`).

### ❌ Ignoring Telegram Theme

**Why bad**: Feels foreign in Telegram.
Bad user experience.
Jarring transitions.
Users don't trust it.

**Instead**: Use tg.themeParams.
Match Telegram colors.
Use native-feeling UI.
Test in both light/dark.

### ❌ Desktop-First Mini App

**Why bad**: 95% of Telegram is mobile.
Touch targets too small.
Doesn't fit in Telegram UI.
Scrolling issues.

**Instead**: Mobile-first always.
Test on real phones.
Touch-friendly buttons.
Fit within Telegram frame.

### ❌ No Loading States

**Why bad**: Users think it's broken.
Poor perceived performance.
High exit rate.
Confusion.

**Instead**: Show skeleton UI.
Loading indicators.
Progressive loading.
Optimistic updates.

## ⚠️ Sharp Edges

| Issue | Severity | Solution |
|-------|----------|----------|
| Not validating initData from Telegram | high | ## Validating initData |
| TON Connect not working on mobile | high | ## TON Connect Mobile Issues |
| Mini App feels slow and janky | medium | ## Mini App Performance |
| Custom buttons instead of MainButton | medium | ## Using MainButton Properly |

## Related Skills

Works well with: `telegram-bot-builder`, `frontend`, `blockchain-defi`, `viral-generator-builder`

## When to Use

This skill applies when:
- Building or refactoring Telegram Mini App UI
- Migrating from shadcn to Telegram UI
- Designing new pages/sections for a Mini App
- User asks for "Telegram-native" or "design like Telegram" UI

## Refactor Prompt (Agent Reference)

When asked to apply this design approach, execute:

1. **Remove shadcn** — Uninstall shadcn, delete `src/components/ui/` shadcn components, remove `cn()` usage
2. **Regenerate globals.css** — Import TGUI styles; define tokens from TGUI variables only; add Vazirmatn override for RTL
3. **Review & rewrite** — Every page, section, component → use TGUI components only
4. **Design mindset** — Think Telegram product designer; compose TGUI like puzzle pieces; no custom styles
5. **Component docs** — Use Context7 MCP for `@telegram-apps/telegram-ui`; fallback: https://tgui.xelene.me/
6. **Font** — Add Vazirmatn from Google Fonts; use as first priority in `font-family`
