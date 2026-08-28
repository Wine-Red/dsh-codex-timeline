# Changelog

## 0.5.5 - 2026-08-28

- Accept ReactDOM 19 hosts in the peer dependency declaration while retaining ReactDOM 18.3.1 compatibility, avoiding a false setup warning in newer DSH Web environments.

## 0.5.4 - 2026-08-27

- Fix [#8](https://github.com/Wine-Red/dsh-codex-timeline/issues/8): remount the additive timeline bridge when DSH replaces the active Chat view during tab changes. A filtered, animation-frame-coalesced DOM lifecycle observer now disconnects the stale seat, anchors, listeners, and geometry observers when leaving Chat, then binds a fresh Portal to the replacement `[data-chat-flow]` when returning without requiring a Session switch.

## 0.5.3 - 2026-08-25

- Dock the jump progress notice to the bottom-left corner of the conversation area instead of hanging it directly under the rail controls, and drop the fixed top-center banner used on narrow screens. Timing, wording, page counters, error color, and the screen-reader announcement are unchanged; right-side mode keeps the same bottom-left corner so the notice never covers the transcript or the rail.

## 0.5.2 - 2026-08-25

- Address [#6](https://github.com/Wine-Red/dsh-codex-timeline/issues/6): replace the high-contrast post-jump outline with one 640 ms pulse inside the target user bubble. The pulse derives its tint from DSH's semantic brand token so light, dark, and colored themes keep their own palette; it causes no layout shift, does not block interaction, and stands down for reduced-motion and forced-color users while the existing screen-reader announcement remains available.
- Add a persisted, default-on **Flash after jump** preference under Settings → Plugins → Plugin configuration. Turning it off suppresses only the visual arrival pulse and leaves scrolling, landing verification, marker feedback, and accessibility announcements unchanged.

## 0.5.1 - 2026-08-24

- Fix [#5](https://github.com/Wine-Red/dsh-codex-timeline/issues/5): render from projected Turn items before DOM-anchor measurement and retry the additive seat mount when DSH `0.1.1-rc.2` populates an initially empty Chat order. The 0.5.0 rail required `located.length > 0` before registering the anchors that make `located` non-empty, while its lifecycle optimization could also query `[data-chat-flow]` too early and never retry. The corrected startup path mounts the seat, renders from the Turn projection, then measures anchors in place; already-mounted rails still survive history prepends without losing jump, hover, or focus state.

## 0.5.0 - 2026-08-24

- Raise the complete timeline navigation surface above transcript-local sticky layers, so marker previews and their actions remain visually on top of DSH code-block headers and bodies while still staying below drawers and global modals.
- Remove the redundant desktop load-earlier ellipsis. Unloaded marker and complete-session search selections still page automatically through DSH's official history loader, the explicit narrow-screen drawer action remains available, and the marker track reclaims the vacated third control row below search and favorites.
- Base long-jump progress on the materialized Chat order and registered DOM-anchor growth instead of `chat.nodes.size`. DSH may retain a stable backing node projection while older rows are visibly prepended, so the old metric falsely stopped every click after five valid pages and forced the reader to click the same Turn repeatedly. A browser-level replay against a 42-Turn local session now reaches Turn 11 in one selection while stopping at the target.
- Keep the additive navigation Portal mounted when `chat.order` changes. The previous order-coupled seat effect remounted the complete rail after every prepend, which discarded the pending jump after exactly one history page and reset hover/focus/motion state. Page changes now synchronize the keyed anchor registry in place, and the marker staircase again interpolates width over 160 ms instead of snapping between collapsed and disclosed lengths.
- Make index and search jumps feel native to DSH's virtualized transcript. Every on-demand history page now captures the first visible semantic row and its exact offset, updates that anchor if the reader moves while loading, and restores it in a layout effect after prepend. Nearby materialized targets use a short smooth scroll; long-distance and paged jumps place the viewport at most 88 px before the target and ease out over 180 ms, while reduced-motion jumps remain immediate. Every jump releases DSH's sticky-bottom state when necessary, verifies the final position to within 2 px, and corrects once after layout settles. New selections and manual gestures cancel stale motion; paging is single-flight with progress/stall guards rather than the former 30-page ceiling. Slow jumps expose page-aware feedback only after 300 ms, screen readers receive live status, and a successful target gets an 800 ms theme-aware landing highlight.
- Add the persisted **Show on right** setting requested in [#4](https://github.com/Wine-Red/dsh-codex-timeline/issues/4), while keeping left as the backward-compatible default. Right-side mode mirrors the rail, stepped markers, tooltip corridor, search panel, controls, and narrow-screen trigger toward the transcript; its edge offset keeps the DSH scrollbar and native details resize boundary operable instead of covering the Host panel. The 24px tooltip corridor now becomes interactive only after a real marker is disclosed or focused, removing the always-on hover strip beside DSH Read/Edit rows without making the tooltip actions harder to reach.
- Turn the recent-N desktop rail into a fixed, ID-anchored window over the complete session index. Hover or keyboard focus reveals up to two complete, visually graded markers outside each scrollable edge. Each coarse mouse-wheel event moves one Turn with a 170 ms directional slide; rapid bursts use an interruptible 110 ms transition that retargets from the current intermediate frame, fine trackpad deltas are accumulated and rate-limited, and reduced-motion mode switches immediately. While the pointer stays still, the expanded marker and tooltip now switch to the new physical slot in the same wheel update instead of waiting for native hover hit-testing. Filtering to only unloaded favorites preserves the measured viewport and centers short rails instead of collapsing their height to zero. The rail keeps its absolute position and marker count, releases scrolling to the transcript at either boundary, and preserves browser zoom, horizontal gestures, search-result scrolling, and tooltip interaction.
- Extend Arrow/Home/End navigation across unloaded window boundaries, add Page Up / Page Down movement, preserve a valid roving tab stop, and keep keyboard focus on-screen when the wheel moves a focused marker out of view.
- Stop truncating the lightweight full-session index at 500 Turns so every timeline marker remains reachable; the client still renders only the configured 5–50 main markers plus at most two graded edge guides per edge.
- Promote both graded edge-guide markers from decorative hints to full navigation targets. They now expose the same hover/focus preview, click and keyboard jump behavior, loading feedback, tooltip corridor, and 39 / 30 / 21 / 15px neighboring wave as the main rail. Their inactive 7px / 5px lengths, 2px weight, two-level opacity, and fixed positions remain unchanged, and reduced-motion mode removes their width transition.

## 0.4.1 - 2026-08-21

- Remove the diagnostic jump-status chip from the rail (the loading/locating/landed/failed status text shown while jumping to an unloaded Turn). The jump logic itself is unchanged: paging stops at the target, anchor measurement is retried a bounded number of times, jumps give up after 30 pages, and status remains available in the browser console.

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
