# VALHUB design rules

VALHUB looks like a real, native app: platform navigation, platform type, platform icons,
grouped lists and content imagery. It must never look template- or AI-generated. Every rule
below is a hard ban; a review that finds one is a bug.

## Banned

| Do not use | Use instead |
|---|---|
| Hard color gradients, rainbow gradients, gradient fills behind content | Solid surfaces. The only gradient allowed is the soft dark scrim that keeps text legible on photos (`HeroCard`). |
| Lucide (or any web icon pack) | `Icon` → SF Symbols on iOS, Material Symbols on Android (`expo-symbols`). |
| Pure white (`#FFF`) backgrounds or sheets | Warm paper tokens (`paper0/50/100`) in light mode. |
| Shadows on everything | No shadows. Hierarchy from spacing, type and hairlines. |
| Three cards side by side | One column, two columns, or a dense roster (four or more). |
| Emoji as icons or decoration | Platform icons, or nothing. |
| Frosted glass / blur materials | Opaque bars and surfaces. (iOS 26 Liquid Glass drawn by the OS itself is the only exception.) |
| Em dashes in UI copy | Comma, colon or period. `{start}–{end}` ranges keep the en dash. |
| Inter, Geist or any downloaded grotesk/display font | Platform type only (SF / Roboto). |
| Colored stripe on the left of a heading, card or row | Plain headings. |
| Made-up reviews, testimonials, stats or sample data | Real content from providers, or an honest empty/error state. |
| Bento box layouts (mixed-size tiles) | Uniform grids or grouped lists. |
| Terminal / code-console screens as decoration | Real UI. |
| "Not X, it's Y" marketing copy | Plain, specific sentences. |
| Leading check marks (on chips, list items, bullets) | Selected state by inversion or a trailing platform check in pickers. |
| Three-tier pricing tables | Not applicable to this app; never add one. |
| Fake product / placeholder screens | Only ship features that work against real data. |
| Over-rounded corners, capsule buttons and chips | `radius.sm/md/lg` (4/6/10). `radius.full` only for true circles (avatars, dots). |
| Purple-on-black palettes, neon colors, cliché pastels | The token palette: warm neutrals + one vermilion accent. "Subtle" status tones are neutral fills; color lives in the text/icon. |
| Blank screen while loading | Skeletons in the shape of the content (`QueryView`, `SkeletonRows`). |
| Blurred light blobs, glows, dotted/grid backgrounds | Plain backgrounds. |
| Sparkle icons, wiggling/bouncing arrows | Static icons; motion only to show a state change. |
| Hover effects | Touch feedback only (pressed dim for cards, highlight for rows). |
| Missing terms of use / privacy policy | Both live in-app (`src/legal/documents.ts`, Settings › About) and must match what the app actually does. |

## Building blocks

- Lists: `RowGroup` + `ListRow` (plain leading icon in `textSecondary`).
- Media: `HeroCard`, `MediaCard` (caption below the image), `ShowcaseCard`. All use `radius.md`.
- Section titles: `SectionHeader` (plain `titleSm` text).
- Selection: `FilterChip` inverts when selected; `SegmentedControl` for exclusive modes.
- Navigation: `NativeTabs` on both platforms, native stack headers. No custom tab bars.
