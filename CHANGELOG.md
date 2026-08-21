# Changelog

## 0.4.0 - 2026-08-21

- Adapt the verified window to DSH `0.1.1-rc.2` (verify declarations, peer ranges, installer, settings ABI).
- Show the turn timeline for short sessions too: remove the previous "hide below three user messages" rule, so the rail appears from the first message and only stands down when nothing is loaded and no earlier history exists.
- Replace the "automatically load full history" toggle with a **turns-shown** setting: the rail lists the RECENT N Turns (default 25, adjustable 5–50 under Settings → Plugins → Plugin configuration) without materializing the transcript; spacing follows the user's own "marker spacing" setting so the rail keeps its original look, loaded Turns highlight the current reading position, and unloaded Turns — from the `lite=1` index — hover to a two-line summary, chain-load on click and stop at the target instead of paging the whole history. Timestamp formatting is cached per locale instead of constructing an `Intl.DateTimeFormat` per marker per render, which was the rail's main jank source.
- The rail's trigger stack no longer shifts: search / favorite / load-earlier buttons and the marker track keep fixed positions, with the load-earlier button at the bottom of the stack.
- Index steering Turns too: `kind === "steering"` nodes were missing from the browser index, so clicking such a Turn chained pages forever — they are now indexed with a jumpable anchor (matching the session-index口径), and jumps give up after 30 pages instead of loading the whole history. Jump staging is observable on the rail (loading / locating / landed / failed) and logged to the console.
- Read the session index without the replay validator: the search route prefers the live event array, then the persisted raw JSONL artifact (`sessionPersistence.readRaw`, ~50ms for a 20k-event log), and only falls back to `readSession`'s full replay when neither is available — the lite request that used to take 6–8s now answers in ~200–400ms. The lite index is cached by session revision.
- Project turn closure correctly: `turn/end` boundaries carry no surface marker, so they are processed outside the surface gate; never-closed Turns report "unknown" status (a live open turn dedupes to the browser-side status once loaded).
- Search the COMPLETE session log, not just the loaded window: the Host serves a new `GET /codex-timeline/search?sessionId=&q=` route backed by the `sessionQuery` service, returning one item per matched Turn (real user prompts + assistant text blocks, current surface only); the full-log results merge into the search panel and drawer with an "N from earlier history" hint, and an unloaded result chain-loads and jumps.
- Degrade gracefully when the deployment does not mount a `sessionQuery` service: the route answers 503 and the browser keeps the previous loaded-window-only search with the "earlier content is not loaded" status.
- Keep the pure projections (`buildTurnIndex`, `buildTurnSearchIndex`, `extractEventSearchText`, `currentSurfaceSeqs`, `searchWindowedSource`) testable in `src/navigation-model.mjs` and pinned by distribution checks.

## 0.3.3 - 2026-08-20

- Keep the complete 0.3.2 interface and style corpus unchanged.
- Add a narrow rc.8 message-image slot bridge while retaining the rc.7 image component path.
- Verify both DSH `0.1.0-rc.7` and `0.1.0-rc.8`, with peer ranges capped before rc.9.
- Keep the bundled Host settings dependency on the rc.7 baseline to prevent cross-version dependency mixing during rc.7 installs.
- Stop disabling, replacing, or registering any part of the official Conversation plugin.
- Mount the unchanged 0.3.2 timeline through the additive session-header lifecycle seat and the stable chat-flow/anchor DOM contracts present in rc.7 and rc.8.
- Isolate Host, settings, and slot startup failures so an adapter failure removes only the timeline and can never suppress the conversation UI.
- Fail distribution checks if any of the original 0.3.2 style blocks changes.

## 0.3.2 - 2026-08-17

- Align the Windows installer version check and status messages with the verified DSH `0.1.0-rc.7` runtime.
- Add a package contract test to prevent the installer from regressing to the older rc.6 runtime check.

## 0.3.1 - 2026-08-17

- Support DSH `0.1.0-rc.7` by registering the plugin settings card with its Host settings namespace as the keyed-slot key.
- Retain the rc.6 list-slot `id` alongside the rc.7 `key` so the emitted browser adapter remains loadable across both slot contracts.
- Pin the release metadata and peer dependencies to the officially tagged DSH rc.7 runtime while retaining the documented rc.6 conversation adapter source.

## 0.3.0 - 2026-08-16

- Add an optional automatic history loader that repeatedly requests the next official DSH history page at 80 ms intervals until the complete transcript is materialized.
- Add stable per-Turn favorites and branch actions without changing the underlying Chat snapshot contract.
- Refine marker hover/focus behavior, keep the reading-position marker subtle while browsing, and bridge the pointer gap to the tooltip.
- Widen the desktop Turn tooltip and keep its ordinal, dated timestamp, status, and actions on one stable metadata line.
- Render answer summaries as strict two-line plain-text previews without Markdown rendering or partially clipped lines.
- Validate the emitted browser bundle syntax and module-loader registration during release checks.

## 0.2.0 - 2026-08-15

- Move the timeline settings into 设置 → 插件 → 插件配置 as a standalone card that matches the official plugin-card style (disclosing header, field rows, overridden badges).
- Reduce the settings surface to one enable toggle plus three tuning sliders: distance from the panel's left edge (0–120 px), vertical offset from the panel center (–200–200 px), and marker spacing (6–40 px).
- Persist every preference through the Host settings document (settings.yaml) via a dedicated `/codex-timeline/settings` route, replacing browser-localStorage persistence; values survive reloads, browser switches, and other profiles of the same deployment.
- Anchor the top-left ⋮ / search controls independently: position offsets move only the marker column, never the controls.
- Make the left-offset slider strictly non-negative (0 = flush with the conversation panel's left edge).
- Add `id`/`name` attributes and `label` associations to every form field (sliders, search inputs) for autofill and accessibility.

## 0.1.2 - 2026-08-15

- Replace the Codex reference crops with screenshots captured from DSH `0.1.0-rc.6`.
- Capture both compact and hover-expanded states from a dedicated five-Turn test conversation.
- Keep all visible screenshot content limited to explicit documentation test copy.

## 0.1.1 - 2026-08-15

- Add a purpose-built project cover and a bilingual visual feature tour.
- Document the compact and stepped-hover timeline states with real UI captures.

## 0.1.0 - 2026-08-15

- Add a compact user-Turn navigation rail to the left edge of active Chat content.
- Track the current viewport Turn without stealing scroll during streaming.
- Add local prompt/answer previews, Turn metrics, and loaded-content search.
- Reuse DSH history paging and preserve anchors across prepends.
- Add keyboard navigation, reduced-motion behavior, responsive presentation, and durable DSH settings.
- Package the exact DSH `0.1.0-rc.6` compatibility adapter as an installable bundle.
