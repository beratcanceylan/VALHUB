# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

VALHUB is a VALORANT reference and improvement companion for iOS and Android: Expo SDK 57, React Native 0.86, React 19.2, strict TypeScript. The Expo app lives at the repository root and runs entirely on-device. There is no VALHUB server. Product scope: `docs/product.md`. Visual rules: `docs/design.md`.

## Commands

Node ≥ 22.13. Run everything from the repository root (npm workspaces: `packages/*`).

| Command | Purpose |
|---|---|
| `npm start` / `npm run android` / `npm run ios` | Expo dev server |
| `npm run ci` | typecheck → lint → policy checks → all tests (must pass) |
| `npm run typecheck` | `tsc` for the app and every package |
| `npm run lint` | ESLint, `--max-warnings=0`, includes architecture import rules |
| `npm run check` | fixture-import, bundled-asset and secret gates (`tooling/`) |
| `npm test` | `test:unit` (Vitest, `packages/*/test`) then `test:mobile` (Jest, `test/`) |
| `npm run build:mobile` | export iOS + Android bundles (catches Metro/bundling errors tests miss) |

Single tests:
- Package (Vitest): `npx vitest run --project unit packages/core/test/<file>.test.ts` (add `-t "<name>"` to filter)
- App (Jest, jest-expo): `npx jest test/<file>.test.tsx` (add `-t "<name>"`)

Install Expo/RN packages with `npx expo install <pkg>`, never plain `npm install`. Never hand-edit `ios/` or `android/` (CNG); configure through `app.json` and config plugins.

## Architecture

**Packages** (`packages/*`, imported as `@valhub/<name>`):
- `domain`: entities, `AppError`, and pure game/tool logic (stats, search, crosshair codes, sensitivity). No I/O.
- `core`: all network access. `adapters/` (valorant-api, playvalorant `__NEXT_DATA__` parsing, wiki) map provider DTOs to domain types. `riot-client/` holds the unofficial Riot game-client API (auth, store, matches). `services/` holds search, agent media and local capabilities/bootstrap. `createCore()` is the entry point.
- `schemas` / `api-contract`: zod schemas; `api-contract.responses` is the contract every result is validated against. The name is historical; there is no HTTP API.
- `design-tokens`: spacing, radius, type ramp (separate iOS ramp), semantic light/dark colors.
- `test-fixtures`: captured provider samples, test-only.

**Data flow in the app:** `createCore()` (`src/data/core.ts`) → React Query hooks in `src/data/queries.ts` → every loader is wrapped in `call(key, loader)` (`src/data/client.ts`), which validates against `api-contract` and normalizes errors into `AppError`. Screens consume hooks through `QueryView` (`src/components/ui/QueryView.tsx`), which renders loading skeletons, keeps stale data with a notice, and shows typed error states.

**Capabilities:** `packages/core/src/services/local.ts` decides feature availability. `PERSONAL_STORE`, `MATCHES` and `LEADERBOARD` require a Riot session; `AUDIO` stays `RIGHTS_UNCLEARED`. UI checks capabilities with `useCapability` and shows an honest notice instead of fake content.

**Riot auth:** sign-in runs in a WebView (`src/features/auth`). Tokens live only in `expo-secure-store` (`src/auth/tokens.ts`); `src/auth/session.tsx` exposes the session; `needsReconnect` drives the expired-session UI. The `X-Riot-ClientVersion` header comes from valorant-api `/v1/version`; LATAM/BR use the NA shard. Breakage of these unofficial endpoints surfaces as `UPSTREAM`.

**Local storage:** `expo-sqlite` (`src/data/cache/db.ts`) holds preferences, a bounded query cache, and library repositories (favorites, crosshairs, strategies, reaction history, recent searches) in `src/data/repositories/library.ts`. Removing a feature must not delete saved user data.

**Media:** remote only. Images go through `RemoteImage`/expo-image, restricted to the host allowlist (`src/data/media-policy.ts`, fed from `MEDIA_HOSTS`). Videos stream via `RemoteVideo` and are never cached. ESLint bans React Native's `Image` in `src/`.

**Routing:** Expo Router. `src/app` files are thin re-exports; screens live in `src/features/<feature>`. Tabs (`src/app/(tabs)`) use `NativeTabs` on both platforms (`src/components/navigation/SystemTabs.tsx`): Home, Guide, Library, Account, plus Search as the `role="search"` tab. Each tab root is a native stack built by `TabStack.tsx`. Detail and tool screens are root-stack routes outside the tabs. Settings (`/settings/*`) and legal documents (`/legal/*`) are also root routes.

**UI layer:** shared primitives are in `src/components/ui` (barrel `index.ts`), app-specific composites in `src/components/domain`. Icons go through `Icon` with semantic names (SF Symbols on iOS, Material Symbols on Android via `expo-symbols`). The Android symbol font is preloaded at startup (`src/design/fonts.ts`).

## Rules enforced by tooling (keep green)

- No mock/fixture data in production paths. `@valhub/test-fixtures` is test-only (ESLint + `tooling/check-fixture-imports.mjs`).
- No bundled VALORANT media or content dumps, no local image/JSON `require`s, no image `prefetch` (`tooling/check-bundled-assets.mjs`; `assets/` ≤ 2 MB).
- No secrets anywhere, never `EXPO_PUBLIC_*` secrets (`tooling/check-secrets.mjs`).
- Provider DTOs never leave `packages/core/src/adapters/*` and `riot-client/*`. UI imports only `@valhub/domain` types (ESLint blocks `**/adapters/**` and `**/dto` in `src/`).
- Feature screens take tokens from `useTheme()` and strings from `useT()`: no hex values or UI string literals in features.
- i18n: `src/i18n/en.ts` defines `Messages`. All 18 locale catalogs must have exactly the same keys and placeholders (`test/i18n.test.ts`), so add every new key to every locale (`es-MX` spreads `es`). Long-form legal text lives in `src/legal/documents.ts` (en + tr; other locales show English) and must match actual data handling.

## Design rules

Follow `docs/design.md`. Its banned list is a hard requirement from the project owner. Highlights:
- No gradients (except the legibility scrim on photos), shadows, blur/glass, pastel tints, or capsule buttons/chips.
- No downloaded fonts (platform type only), no web icon packs, no accent stripes, and no em dashes in copy.
- Use grouped lists (`RowGroup`/`ListRow`) and content imagery (`HeroCard`, `MediaCard`, `ShowcaseCard`).

## Gotchas

- React must be a single copy (root `overrides` pin `react`, `react-dom`, `react-native-worklets`). Two copies break Metro and Jest with invalid-hook errors. Check with `npm ls react`.
- `expo-notifications` throws on import in Expo Go on Android: always use `getNotifications()` (`src/notifications/native.ts`).
- RNTL v14: `render`/`fireEvent` are async; `await` them.
- PlayValorant agent slug is `slugify(name)` (KAY/O → `kay-o`); parsing is defensive and degrades to `UPSTREAM_DOWN`.
- Expo APIs change every SDK: check the versioned docs (`https://docs.expo.dev/versions/v57.0.0/`) instead of relying on memory.
