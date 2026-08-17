# Changelog

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
