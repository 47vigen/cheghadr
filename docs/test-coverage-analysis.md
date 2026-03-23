# Test Coverage Analysis & Improvement Proposals

## Current State

The codebase has **16 test files** covering core business logic and utilities. The test suite uses **Vitest** with a node environment. Most tests are unit tests with mocked dependencies; there is one broader integration test for the tRPC router layer.

### Coverage Distribution

| Area | Files | Test Files | Status |
|---|---|---|---|
| `src/lib/` utility functions | ~12 | 11 | Good |
| `src/server/api/` (tRPC routers) | 5 routers | 1 integration test | Partial |
| `src/server/auth/` | 2 | 1 | Good |
| `src/server/cron/` | 3 | 1 (auth only) | Partial |
| `src/types/` (schemas) | 4 | 1 (parseBreakdownJson only) | Partial |
| `src/trpc/` | 7 | 1 | Partial |
| `src/components/` | ~40 | 0 | None |
| `src/hooks/` | 7 | 0 | None |
| `src/providers/` | 5 | 0 | None |
| `src/app/api/` (route handlers) | 4 | 0 | None |

---

## Proposed Improvements

The following areas are ranked by **impact and feasibility** — focusing on places where bugs are most likely, least visible, and hardest to debug without automated tests.

---

### 1. Alert Evaluation Edge Cases (`src/lib/__tests__/alert-evaluation.test.ts`)

**Priority: High**

The alert system is the most user-facing failure-sensitive area. A bug here means users either get spammed with spurious notifications or miss important price crossings. The current tests cover the happy path and the basic "no crossing" case, but several scenarios are untested.

**Missing cases:**

- **Price exactly at threshold**: When `price === threshold`, neither ABOVE nor BELOW should fire. The current test only checks "stays above" or "stays below", not the exact boundary.
- **Multiple crossings in one evaluation run**: If two different alerts fire for the same symbol, both should be processed. The current multi-alert test uses different symbols.
- **Database failure during alert deactivation**: If `prisma.alert.update()` throws, the function should not crash — it currently counts the alert as "failed to send" but the database update error is unhandled.
- **`PORTFOLIO` alert type**: The evaluation function appears to handle portfolio value alerts too. This is not tested at all.
- **Alerts for symbols not present in the new snapshot**: The symbol may have been removed or renamed in a snapshot update.

```typescript
// Example: price exactly at threshold should not fire
it("does not fire when price equals threshold exactly", async () => {
  // previous: 100, current: 100, threshold: 100, direction: ABOVE
  // → price did not cross above, it was already at threshold
});

// Example: database update failure is handled gracefully
it("handles db update failure without throwing", async () => {
  mockPrisma.alert.update.mockRejectedValue(new Error("DB error"));
  // should still return counts, not throw
});
```

---

### 2. Schema Validation — `parseBreakdownJson` (`src/types/__tests__/schemas.test.ts`)

**Priority: High**

`parseBreakdownJson` is used when reading historical portfolio snapshots from the database. A malformed snapshot that slips past validation will silently corrupt the portfolio history UI. The existing tests only cover the most basic shapes.

**Missing cases:**

- **Partial arrays**: An array where some items are valid and some are not. The function should either return all-or-nothing or filter out invalid items — the current behaviour is unclear and untested.
- **Missing individual fields**: Items missing only `symbol`, only `quantity`, or only `totalIRT` (but not all three).
- **Empty array `[]`**: Should return `[]`, not fail.
- **Decimal quantities**: `quantity: "0.00123456"` — important for crypto assets.
- **Negative and zero values**: `totalIRT: "0"` and `totalIRT: "-500"` should be valid.
- **Extra fields**: An item with additional unknown fields should still parse (or be rejected consistently).

```typescript
it("returns empty array for empty input array", () => {
  expect(parseBreakdownJson([])).toEqual([]);
});

it("handles decimal quantity strings", () => {
  const input = [{ symbol: "BTC", quantity: "0.00123", totalIRT: "5000000000" }];
  expect(parseBreakdownJson(input)).toEqual(input);
});

it("returns empty array when one item in array is invalid", () => {
  const input = [
    { symbol: "BTC", quantity: "1", totalIRT: "100" },
    { symbol: 42, quantity: "1", totalIRT: "100" }, // symbol is number, not string
  ];
  // document and test whether this returns [] or filters to the valid item
});
```

---

### 3. Cron Job Logic — Price & Portfolio Snapshots (`src/server/cron/`)

**Priority: High**

The cron jobs are the backbone of the data pipeline. `price-snapshot.ts` fetches live prices and stores them; `portfolio-snapshot.ts` creates value snapshots for all users. These are completely untested beyond the auth guard.

**What to add:**

- **`verifyCronAuth` edge cases** (extend existing file):
  - Missing `Authorization` header entirely (currently only "wrong token" is tested)
  - Malformed header (e.g., `"Token abc"` instead of `"Bearer abc"`)
  - Empty `CRON_SECRET` environment variable (empty string vs. missing)

- **`portfolio-snapshot.ts` unit tests** (new file):
  - Skips users with no portfolios
  - Skips portfolios with no assets
  - Calls `createPortfolioSnapshot` once per portfolio
  - Handles a mix of users — some with recent snapshots, some without

- **`price-snapshot.ts` unit tests** (new file):
  - Stores snapshot when API returns valid data
  - Skips storage when API returns empty or malformed response
  - Handles API fetch failures gracefully (does not throw, logs error)

```typescript
// src/server/cron/__tests__/auth.test.ts additions
it("returns 401 when Authorization header is missing", () => {
  const req = new Request("http://localhost", { headers: {} });
  const result = verifyCronAuth(req);
  expect(result?.status).toBe(401);
});

it("returns 401 for non-Bearer Authorization header", () => {
  process.env.CRON_SECRET = "secret";
  const req = new Request("http://localhost", {
    headers: { Authorization: "Token secret" },
  });
  expect(verifyCronAuth(req)?.status).toBe(401);
});
```

---

### 4. tRPC Routers — Missing Procedures & Error Paths (`src/server/api/__tests__/app-router.test.ts`)

**Priority: Medium-High**

The existing integration test is a good foundation. However, it tests the "happy path" for most procedures and misses a number of error conditions and less-common operations.

**Missing cases:**

**Assets router:**
- `assets.list` with multiple assets across multiple portfolios — verify isolation between portfolios
- `assets.add` with a decimal quantity (e.g., `0.5 BTC`)
- `assets.add` upsert: calling add twice for the same symbol should update quantity, not create a duplicate
- `assets.delete` for an asset that does not exist

**Portfolio router:**
- `portfolio.delete` when the user has more than one portfolio (should succeed)
- `portfolio.rename` (if this procedure exists)
- `portfolio.history` with no snapshots — should return empty array, not error

**Alerts router:**
- `alerts.create` for a `PORTFOLIO` type alert (different validation path than `PRICE`)
- `alerts.delete` for an alert not owned by the caller (should be forbidden)
- `alerts.toggle` (enable/disable) — if this procedure exists

**Auth:**
- Multiple authenticated calls in a single test to confirm session is reused correctly

---

### 5. `shouldDehydrateTrpcQuery` — Exhaustive Router Coverage (`src/trpc/__tests__/should-dehydrate-query.test.ts`)

**Priority: Medium**

The function controls what is server-side rendered vs. fetched client-side. If a new router is added and this function is not updated, the route will silently behave incorrectly (either leaking user data into SSR or failing to preload public data). Tests here serve as a **registry** of which routers are public.

**Missing cases:**

- Explicit test that `prices` is the **only** allowed SSR router — use a parametrized test across all known router names
- New router names added to the codebase should cause this test to fail until the function is explicitly updated
- Query status `"loading"` (in addition to `"pending"` and `"error"`)

```typescript
const USER_SCOPED_ROUTERS = ["alerts", "assets", "portfolio", "user"];
const PUBLIC_ROUTERS = ["prices"];
const ALL_ROUTERS = [...USER_SCOPED_ROUTERS, ...PUBLIC_ROUTERS];

it.each(USER_SCOPED_ROUTERS)(
  "blocks SSR for user-scoped router: %s",
  (router) => {
    const key = [["trpc", router, "list"]];
    expect(shouldDehydrateTrpcQuery({ queryKey: key, status: "success" })).toBe(false);
  }
);

it.each(PUBLIC_ROUTERS)(
  "allows SSR for public router: %s",
  (router) => {
    const key = [["trpc", router, "latest"]];
    expect(shouldDehydrateTrpcQuery({ queryKey: key, status: "success" })).toBe(true);
  }
);
```

---

### 6. Telegram Auth — Boundary & Negative Cases (`src/server/auth/__tests__/telegram.test.ts`)

**Priority: Medium**

The existing auth tests are solid but leave a few boundaries untested that could matter in production.

**Missing cases:**

- **Exactly at the 1-hour boundary**: `auth_date` = `now - 3600` seconds exactly. Should this pass or fail? The current test uses `now - 3601` (expired) and a fresh timestamp (valid). The off-by-one is unspecified.
- **Future `auth_date`**: A timestamp in the future should be treated as invalid.
- **`auth_date` missing**: `initData` without an `auth_date` field.
- **`user` field missing**: Valid HMAC but no user object in the payload.
- **Widget: extra legitimate fields**: Some Telegram widgets include `photo_url` or `username` — are these handled?

---

### 7. `formatCompactCurrency` — Extended Ranges (`src/lib/__tests__/format-compact-currency.test.ts`)

**Priority: Low-Medium**

Currency formatting is visible to users in every price view. The function is well-tested for the K and M ranges, but larger and edge values are not covered.

**Missing cases:**

- **Billion range** (`1_000_000_000`): Should format as `1B` or `1,000M`?
- **Negative values**: `-500` should format as `-500`, `-1500` as `-1.5K`
- **Very small decimals**: `0.001` — should display as `0` or `< 0.01`?
- **`NaN` and `Infinity`**: Should not throw

```typescript
it("formats negative values with compact notation", () => {
  expect(formatCompactCurrency(-1500, "USD")).toBe("-$1.5K");
});

it("does not throw for NaN input", () => {
  expect(() => formatCompactCurrency(NaN, "USD")).not.toThrow();
});
```

---

### 8. `NotificationQueue` — Concurrency & State (`src/lib/__tests__/notifications.test.ts`)

**Priority: Low-Medium**

The queue is the delivery mechanism for all user-visible alerts. Its current tests cover the single-drain happy path. Two gaps stand out:

- **Calling `drain()` twice concurrently**: If two cron ticks overlap, the queue could be drained by two simultaneous calls. What happens to the second caller — does it get an empty result or process the same items twice?
- **Enqueueing during a drain**: Items added to the queue while a `drain()` is in progress — are they included in the current drain or deferred to the next?
- **`alertId` tracking in results**: The current tests verify `sent`/`failed` counts but do not check that the returned `alertIds` correspond to the correct items.

---

### 9. React Hooks — `usePlatform` and `useAssetSearchGroups`

**Priority: Low**

These hooks contain non-trivial logic that currently has zero test coverage. They can be tested with `@testing-library/react` and `renderHook`.

**`usePlatform`** (`src/hooks/use-platform.ts`):
- Returns `"telegram"` when Telegram SDK is initialized
- Returns `"web"` in a standard browser environment
- Reacts to environment variable overrides (if any)

**`useAssetSearchGroups`** (`src/hooks/use-asset-search-groups.ts`):
- Filters the price list by search query (Persian and English)
- Groups results by category
- Returns empty groups when query matches nothing
- Handles special characters in queries

These hooks are pure logic wrappers over existing utility functions that are already tested. Covering the hooks themselves validates the composition and parameter wiring.

---

## Configuration Improvements

### Enable Coverage Reporting

Currently there is no coverage report configured. Adding coverage thresholds makes regressions visible in CI:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // ... existing config ...
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/lib/**", "src/server/**", "src/types/**", "src/trpc/**"],
      exclude: ["src/modules/API/**", "src/**/__tests__/**"],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
      },
    },
  },
});
```

This requires adding `@vitest/coverage-v8` as a dev dependency.

### Add `vitest.config.ts` `exclude` for Generated Code

The auto-generated Ecotrust Swagger client (`src/modules/API/Swagger/ecotrust/gen/`) should be explicitly excluded from any future coverage runs to avoid inflating untested-file counts.

---

## Summary Table

| Proposal | Files Affected | Effort | Impact |
|---|---|---|---|
| Alert evaluation edge cases | `alert-evaluation.test.ts` | Low | High |
| Schema `parseBreakdownJson` gaps | `schemas.test.ts` | Low | High |
| Cron job logic tests | New: `price-snapshot.test.ts`, `portfolio-snapshot.test.ts`; extend `auth.test.ts` | Medium | High |
| tRPC router missing procedures/errors | `app-router.test.ts` | Medium | Medium-High |
| `shouldDehydrateTrpcQuery` registry | `should-dehydrate-query.test.ts` | Low | Medium |
| Telegram auth boundaries | `telegram.test.ts` | Low | Medium |
| `formatCompactCurrency` ranges | `format-compact-currency.test.ts` | Low | Low-Medium |
| `NotificationQueue` concurrency | `notifications.test.ts` | Medium | Low-Medium |
| React hooks unit tests | New: `use-platform.test.ts`, `use-asset-search-groups.test.ts` | Medium | Low |
| Coverage reporting in Vitest | `vitest.config.ts`, `package.json` | Low | Medium |
