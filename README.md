# VALHUB

A VALORANT knowledge and improvement companion for iOS and Android, built with
Expo SDK 57, React Native 0.86, React 19.2 and strict TypeScript.

The Expo app lives at the repository root. There is no separate VALHUB server.
See [docs/product.md](docs/product.md) for the current product and architecture.

## Structure

```text
src/
  app/             Expo Router routes and navigation layouts
  features/        Screens grouped by feature
  components/      Shared UI and domain components
  data/            Validated queries, SQLite cache and repositories
  auth/            Riot session and secure token storage
  design/          Theme and appearance preferences
  i18n/            Locale catalogs and fallbacks
  notifications/   Local store and training reminders
  analytics/       Event interface and development sink
  lib/             Shared application helpers
assets/            App icons and splash assets
test/              Mobile tests (Jest)
packages/
  core/            On-device providers, search and Riot Client API
  domain/          Entities and pure game/tool logic
  schemas/         Runtime domain validation
  api-contract/    On-device result contracts (no HTTP server)
  design-tokens/   Shared design tokens
  test-fixtures/   Test-only provider samples
tooling/           Fixture, asset and secret checks
docs/              Current product documentation
```

Root `package.json`, `app.json`, `eas.json` and `tsconfig.json` configure the
app. Internal packages retain their own manifests and TypeScript configurations.
Generated dependencies, Expo caches, native projects and exports are ignored by Git.

## Development

Requires Node 22.13 or newer. Run all commands from the repository root:

```sh
npm ci
npm start
```

| Command | Purpose |
|---|---|
| `npm run android` / `npm run ios` | Start Expo and open the target platform |
| `npm run typecheck` | Check the app and every internal package |
| `npm run lint` | ESLint and architecture rules |
| `npm run check` | Fixture, bundled-asset and secret checks |
| `npm test` | Package tests (Vitest), then mobile tests (Jest) |
| `npm run test:unit` / `npm run test:mobile` | Run a test suite separately |
| `npm run test:a11y` | Accessibility tests |
| `npm run build:mobile` | Export iOS and Android Hermes bundles |
| `npm run doctor` | Expo project diagnostics |
| `npm run ci` | Typecheck, lint, policy checks and all tests |

Use `npx expo install` for Expo/React Native dependencies. Notifications require a
development/store build; they are unavailable in Expo Go on Android.

## Supported features

- Agents, abilities, maps, weapons and cosmetics from Valorant-API.
- Official ability videos and news from PlayValorant; attributed wiki excerpts.
- Riot account profile, match history, leaderboard and personal store.
- Crosshair editor, sensitivity calculator, reaction practice and strategy boards.
- Local favorites, query cache, store/training reminders and light/dark themes.
- English and Turkish UI; eight other configured locales fall back to English.

Esports, lineups and CMS guides are excluded from the current app. Agent audio stays
disabled until rights are cleared. Real-device and end-to-end QA remains necessary.

Riot account access uses unofficial game-client endpoints, which may change without
notice. Tokens stay in SecureStore. VALHUB is not endorsed by Riot Games; VALORANT
and related trademarks belong to Riot Games, Inc.
