# VALHUB product and architecture

This document replaces the superseded server-based specification and migration plan.

## Product

VALHUB is a VALORANT reference and improvement app for iOS and Android. The four main
tabs are Home, Guide, Library and Account, plus Search, which every platform renders
apart from the main group (iOS: the system `role="search"` tab, a separate Liquid Glass
control on iOS 26+; Android: the last item of the Material bottom navigation). It
runs on-device without a separately deployed VALHUB backend.

- Home: official news and quick tools. No account-dependent content.
- Guide: agents/abilities, maps/callouts, weapons and cosmetics, with remote media.
- Account: every Riot-account feature in one place — sign-in/out, profile/rank, personal
  store, match history/detail, leaderboard — plus platform status.
- Library: crosshairs, strategy boards, cosmetic wishlist, favorite agents and tools.
- Tools: crosshair import/edit/export, sensitivity conversion and reaction practice.
- Settings: theme, language, reminders, privacy/data management and attribution.
- Search: agents, maps, weapons, cosmetics and editorial crosshairs.

Esports, community lineups and CMS guides have no on-device source and are excluded,
including routes, query contracts and search categories. AI coaching is not
implemented. Agent voice lines remain disabled (`RIGHTS_UNCLEARED`).

## Data and architecture

The root application uses internal packages: domain entities/pure logic, core
provider access, runtime schemas, result contracts and design tokens. Test fixtures
are restricted to tests. Routes in `src/app` are thin; screens live in `src/features`.

Screens use `src/data/queries.ts`. Core results pass through `call(key, loader)` in
`src/data/client.ts` before reaching the UI. The historical `api-contract` package
name describes in-process results, not server endpoints. Provider DTOs stay inside
core adapters and the Riot client; screens consume domain types.

Public content comes from Valorant-API, official PlayValorant pages and the wiki.
Provider failures produce typed errors; mock data never replaces missing content.
Bootstrap/capabilities are built locally without network access. Account-dependent
features require a Riot session; signed-out users get a sign-in prompt. Network
retries and caches are bounded.

Riot sign-in uses Riot's WebView flow. Tokens stay in SecureStore, expire and can be
renewed through sign-in. Unofficial game-client endpoints can change and make account
features unavailable. Never embed server API keys or secrets in the app or logs.

SQLite stores favorites, crosshairs, strategies, reaction history, preferences and
bounded query-cache entries. Feature removal must not erase saved user data. Legacy
unsupported records may remain in storage without UI entry points.

## Media and user experience

- Fetch game content/media at runtime; do not bundle content dumps or VALORANT media.
- Use approved media hosts. Stream videos without downloading or caching them.
- Preserve source attribution, wiki license attribution and the Riot disclaimer.
- Use semantic theme tokens, shared primitives, accessible labels and touch targets.
- Follow `docs/design.md`: its banned list (gradients, web icon packs, glass, shadows,
  capsules, pastels, downloaded fonts, em dashes in copy, ...) is enforced in review.
- Keep the in-app privacy policy and terms of use (`src/legal/documents.ts`) in sync with
  actual data handling.
- English/Turkish catalogs must have matching keys and placeholders. Other configured
  locales fall back to English until translated.
- Store/training reminders are local, opt-in and permission-dependent.
- Analytics honors opt-out and excludes tokens, identifiers, match payloads and
  free-text queries. The current sink only logs in development.

## Validation

`npm run ci` must pass. Tooling enforces fixture boundaries, asset policy and secret
checks. Export both iOS and Android bundles. Device QA covers sign-in/reconnect,
offline startup, provider failures, navigation, tools, persistence, localization and
accessibility.
