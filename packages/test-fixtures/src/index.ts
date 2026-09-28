/**
 * Deterministic fixtures for tests and CI ONLY.
 *
 * `providers.json` holds trimmed real responses captured from the upstream providers
 * (valorant-api.com, wiki.playvalorant.com) so adapter contract tests
 * exercise real shapes. Riot match data is synthetic because production Riot access is
 * credential-gated. Production modules must never import this package — see
 * tooling/check-fixture-imports.mjs.
 */
import captured from "./captured/providers.json";

export const providers = captured;

/** JSON for an inline `<script>`: `<` is escaped so the payload can never close the tag. */
function scriptJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", String.raw`\u003c`);
}

/** Minimal Next.js page wrapper around official agent ability media blocks. */
export function playValorantAgentHtml(): string {
  const nextData = {
    props: {
      pageProps: {
        page: {
          blades: [
            {
              header: { title: "SPECIAL ABILITIES" },
              groups: [
                {
                  thumbnail: { url: "https://cmsassets.rgpub.io/sanity/images/test/updraft.png" },
                  content: {
                    title: "UPDRAFT",
                    description: { type: "html", body: "INSTANTLY propel Jett high into the air." },
                    media: {
                      type: "video",
                      sources: [
                        { src: "https://cmsassets.rgpub.io/sanity/files/test/updraft.webm", type: "video/webm" },
                        { src: "https://cmsassets.rgpub.io/sanity/files/test/updraft.mp4", type: "video/mp4" },
                      ],
                    },
                  },
                },
                {
                  content: {
                    title: "Drift",
                    description: { type: "html", body: "<p>HOLD JUMP while falling to glide.</p>" },
                    media: { type: "video", sources: [{ src: "https://cmsassets.rgpub.io/sanity/files/test/drift.webm", type: "video/webm" }] },
                  },
                },
                { content: { title: "Not a video", media: { type: "image", url: "https://cmsassets.rgpub.io/x.png" } } },
              ],
            },
          ],
        },
      },
    },
  };
  return `<html><body><script id="__NEXT_DATA__" type="application/json">${scriptJson(nextData)}</script></body></html>`;
}

export function playValorantNewsHtml(): string {
  const nextData = {
    props: {
      pageProps: {
        page: {
          blades: [
            {
              items: [
                {
                  title: "VALORANT Patch Notes 13.05",
                  publishedAt: "2026-09-08T13:00:00.000Z",
                  action: { type: "weblink", payload: { url: "/en-us/news/game-updates/valorant-patch-notes-13-05" } },
                  media: { url: "https://cmsassets.rgpub.io/sanity/images/test/1305.png" },
                  category: { title: "Game Updates" },
                  description: { type: "html", body: "<p>Balance changes.</p>" },
                },
                {
                  title: "VALORANT Patch Notes 13.06",
                  publishedAt: "2026-09-22T13:00:00.000Z",
                  action: { type: "weblink", payload: { url: "https://playvalorant.com/en-us/news/game-updates/valorant-patch-notes-13-06" } },
                },
              ],
            },
          ],
        },
      },
    },
  };
  return `<html><script id="__NEXT_DATA__" type="application/json">${scriptJson(nextData)}</script></html>`;
}

/** Synthetic pd `match-details` payload (the client API names player ids `subject`). */
export function riotMatch(options: { puuid?: string; mapPath?: string } = {}) {
  const me = options.puuid ?? "puuid-me";
  return {
    matchInfo: {
      matchId: "match-1",
      mapId: options.mapPath ?? "/Game/Maps/Ascent/Ascent",
      gameLengthMillis: 1_800_000,
      gameStartMillis: Date.parse("2026-09-20T18:00:00Z"),
      queueId: "competitive",
      isCompleted: true,
    },
    players: [
      {
        subject: me,
        gameName: "Me",
        tagLine: "EUW",
        teamId: "Blue",
        characterId: "ADD6443A-41BD-E414-F6AD-E58D267F4E95",
        competitiveTier: 18,
        stats: { score: 5200, roundsPlayed: 22, kills: 20, deaths: 15, assists: 4 },
      },
      {
        subject: "puuid-other",
        gameName: "Other",
        tagLine: "1234",
        teamId: "Red",
        characterId: "601dbbe7-43ce-be57-2a40-4abd24953621",
        competitiveTier: 17,
        stats: { score: 4100, roundsPlayed: 22, kills: 15, deaths: 20, assists: 6 },
      },
      { subject: "observer", gameName: "Obs", tagLine: "0", teamId: "Neutral", characterId: null, stats: null },
    ],
    teams: [
      { teamId: "Blue", won: true, roundsPlayed: 22, roundsWon: 13 },
      { teamId: "Red", won: false, roundsPlayed: 22, roundsWon: 9 },
    ],
    roundResults: [
      {
        roundNum: 0,
        roundResult: "Eliminated",
        winningTeam: "Blue",
        bombPlanter: me,
        plantSite: "A",
        playerStats: [
          { subject: me, damage: [{ receiver: "puuid-other", damage: 150, legshots: 0, bodyshots: 1, headshots: 1 }] },
          { subject: "puuid-other", damage: [{ receiver: me, damage: 40, legshots: 1, bodyshots: 1, headshots: 0 }] },
        ],
      },
      {
        roundNum: 1,
        roundResult: "Bomb defused",
        winningTeam: "Red",
        bombDefuser: "puuid-other",
        playerStats: [{ subject: me, damage: [{ receiver: "puuid-other", damage: 100, legshots: 0, bodyshots: 2, headshots: 0 }] }],
      },
    ],
  };
}
