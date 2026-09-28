# VALHUB — working notes

Product spec: `docs/product.md`. The app runs on-device with no VALHUB server.

## Non-negotiables (enforced by lint/tests/tooling — keep them green)

- No mock/fixture data in production paths. `@valhub/test-fixtures` is test-only
  (`tooling/check-fixture-imports.mjs`, ESLint `no-restricted-imports`).
- No bundled VALORANT media or content dumps in the app (`tooling/check-bundled-assets.mjs`).
  Content is fetched at runtime through `@valhub/core`; videos stream (`RemoteVideo`, no caching).
- No secrets anywhere (`tooling/check-secrets.mjs`); never `EXPO_PUBLIC_*` secrets. Riot tokens
  live only in `expo-secure-store` (`src/auth`).
- `AUDIO` stays `RIGHTS_UNCLEARED`. `PERSONAL_STORE`, `MATCHES`, `LEADERBOARD` require a Riot
  Client session (`packages/core/src/services/local.ts`).
- Provider DTOs never leave `packages/core/src/adapters/*` and `packages/core/src/riot-client/*`;
  UI imports only `@valhub/domain` types.
- Every core result reaching UI goes through `call(key, loader)` (`src/data/client.ts`),
  which validates it against `@valhub/api-contract` `responses`.
- Feature screens use tokens via `useTheme()` and strings via `useT()` — no hex values or
  UI string literals in features. Add new keys to both `i18n/en.ts` and `i18n/tr.ts`
  (a test checks parity).

## Commands

`npm run ci` runs typecheck → lint → policy gates → all tests.
Mobile: use `npx expo install` for Expo/RN packages. Routes live in `src/app`
(thin re-exports); screens live in `src/features`.

## Gotchas

- React must be a single copy (root `overrides` pins `react`/`react-dom`/`react-native-worklets`).
  If `npm ls react` shows two versions, Metro and Jest break with invalid-hook errors.
- Start Expo from the repository root with `npm start` / `npm run android`.
- `expo-notifications` throws on import in Expo Go on Android: always go through
  `getNotifications()` (`src/notifications/native.ts`), never import it directly.
- Riot Client endpoints (`pd.<shard>.a.pvp.net`) are unofficial: breakage shows up as `UPSTREAM`.
  The `X-Riot-ClientVersion` header comes from valorant-api.com `/v1/version`; LATAM/BR use the NA shard.
- RNTL v14: `render`/`fireEvent` are async — `await` them.
- PlayValorant pages are parsed from `__NEXT_DATA__`; the agent slug is `slugify(name)`
  (KAY/O → `kay-o`). Parsing is defensive and degrades to `UPSTREAM_DOWN`.

This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
