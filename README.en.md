# DSH Codex Timeline

English | [中文](README.md)

<p align="center">
  <img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/cover.png" width="960" alt="DSH Codex Timeline cover showing the turn rail, preview, and search" />
</p>

[![CI](https://github.com/Wine-Red/dsh-codex-timeline/actions/workflows/ci.yml/badge.svg)](https://github.com/Wine-Red/dsh-codex-timeline/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsh-codex-timeline.svg)](https://www.npmjs.com/package/dsh-codex-timeline)
[![license](https://img.shields.io/github/license/Wine-Red/dsh-codex-timeline.svg)](LICENSE)

A subtle user-Turn navigation rail for long DeepSeek Harness Web conversations. It marks only the prompts that actually steer the session, then adds a complete history index, previews, search, and reliable jumps beside the transcript. It defaults to the left and can be mirrored completely to the right.

## What's new in 0.5.2

- **A quieter, more natural arrival cue**: successful jumps no longer draw a high-contrast outline. The target user bubble now flashes once with a short pulse derived from DSH's semantic theme color across light, dark, and colored themes.
- **The flash is independently optional**: Settings → Plugins → Plugin configuration now includes a default-on **Flash after jump** switch. Turning it off leaves navigation, landing verification, and screen-reader announcements unchanged.
- **Restore timeline mounting**: support DSH `0.1.1-rc.2`'s empty-session startup order by attaching the timeline when the transcript first becomes ready, without rebuilding rail state during history prepends.
- **One selection really lands**: an unloaded Turn automatically chains the required history pages, protects the reading anchor, and verifies the final position.
- **Edge guides are real targets**: both graded levels support hover previews, click, keyboard input, and the neighboring wave instead of acting as decoration.
- **Motion shows direction without wasting time**: nearby targets scroll smoothly; distant targets arrive immediately and finish with a 180ms directional settle. Rapid wheel input retargets the current animation.
- **A cleaner, dependable surface**: the redundant desktop paging ellipsis is gone, and preview cards stay above transcript tables and sticky code blocks.

## Interface tour

The four captures below come from the real browser surface of DSH `0.1.1-rc.2` and plugin `0.5.0`, using DSH's native light and dark themes. The capture browser removes the wallpaper layer, registered theme, and token overrides from `dsh-any-background`. To protect local conversations, the transcript, preview, metrics, and search semantics use dedicated documentation copy.

### Default: complete, but quiet

The main index and both edge-guide levels remain low-contrast static dashes until activated. Search and favorites stay pinned above the track without reducing transcript width.

<table>
  <thead><tr><th>Native DSH light</th><th>Native DSH dark</th></tr></thead>
  <tbody><tr>
    <td><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/timeline-default-dsh.png" width="470" alt="The compact 0.5.0 timeline in DSH's native light theme, with search, favorites, and the complete static index" /></td>
    <td><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/timeline-default-dsh-dark.png" width="470" alt="The compact 0.5.0 timeline in DSH's native dark theme, with search, favorites, and the complete static index" /></td>
  </tr></tbody>
</table>

### Hover: preview, wave, and explicit depth

The selected marker expands to 39px while its three neighbors form a 30 / 21 / 15px wave. The preview exposes position, status, performance metrics, two prompt lines, and two answer lines, and remains above sticky transcript surfaces.

<table>
  <thead><tr><th>Native DSH light</th><th>Native DSH dark</th></tr></thead>
  <tbody><tr>
    <td><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/timeline-hover-dsh.png" width="470" alt="The hover-expanded 0.5.0 timeline in DSH's native light theme, showing the graded wave and top-layer preview" /></td>
    <td><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/timeline-hover-dsh-dark.png" width="470" alt="The hover-expanded 0.5.0 timeline in DSH's native dark theme, showing the graded wave and top-layer preview" /></td>
  </tr></tbody>
</table>

### Typical flow

1. Scroll the transcript and let the rail track the current Turn.
2. Hover for two prompt lines and two answer lines; click or press Enter / Space to jump.
3. Select an unloaded Turn once. The plugin materializes only the required history, restores the reading anchor, and completes the jump.
4. Wheel over the rail to move exactly one Turn per notch. At either boundary, scrolling returns naturally to the transcript.
5. Use search, favorites, keyboard navigation, or settings for the visible Turn count and rail side when needed.

## Compatibility

Compatible up to the current verified DSH version (`0.1.1-rc.2`). Do not force-install this release on another DSH version; remove it before upgrading DSH. Node.js `^22.19.0 || >=24.0.0`.

## Install

Check the active version:

```powershell
dsh --version
```

Install from npm into the Web profile:

```powershell
dsh plugin --profile web add dsh-codex-timeline
```

The repository also ships a version-checking PowerShell helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

Restart DSH Web and refresh the page. Verify the composed bundle without booting it:

```powershell
dsh --profile web --dump-config | Select-String -Pattern "dsh-codex-timeline|ui-conversation"
```

The output should contain `# == dsh-codex-timeline`; the built-in `ui-conversation` row should be `disabled: true`, and a new `codex-timeline` row should name `dsh-codex-timeline`.

### Migrating from the legacy local override

If you installed the early same-name Conversation tarball, remove it before adding the standard bundle:

```powershell
dsh plugin --profile web remove "@deepseek-ai/dsh-client-ui-conversation"
dsh plugin --profile web add dsh-codex-timeline
```

## Uninstall

```powershell
dsh plugin --profile web remove dsh-codex-timeline
```

Or run:

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall.ps1
```

Restart DSH Web to return to the built-in Conversation UI.

## Features

### Complete-session index

- Creates markers only for real user Turns. Tool calls, approval UI, plan UI, subagents, and assistant streaming chunks do not add noise.
- The Host `lite=1` index covers the complete persisted session without the former 500-Turn truncation, while transcript content remains on demand.
- The desktop rail uses a fixed window (the latest 25 Turns by default, adjustable from 5–50) plus two complete guide levels at each scrollable edge.
- Main and edge markers all support previews, click, Enter / Space, and arrow keys. Their inactive 7px / 5px guide lengths preserve the existing quiet appearance.
- Each coarse wheel notch moves exactly one Turn. Bursts retarget the current intermediate frame, fine trackpad input accumulates, and boundary input returns to the transcript.

### Reliable jumps

- Nearby materialized targets scroll smoothly. Distant targets arrive at most 88px before the destination, then finish with a 180ms ease-out.
- Unloaded markers and complete-session search results share DSH's official history loader. Paging is single-flight, with lightweight page progress appearing only after 300ms.
- Before each prepend, the plugin captures the first visible semantic row and exact pixel offset. If the reader moves during loading, that anchor follows the reader and is restored after layout.
- Landing is verified and corrected to within 2px, then confirmed by an 800ms theme-aware outline. Wheel, touch, or a new selection immediately cancels stale work.
- Progress combines Chat order, the first materialized node, and registered DOM-anchor growth, avoiding false stalls when the Host projection Map stays stable.

### Preview, search, and favorites

- The preview shows item x/y, time, status, two prompt lines, two answer lines, and real Turn duration, TTFT, and tok/s when available.
- Preview and branch/favorite actions stay above sticky transcript surfaces instead of being covered by code-block banners.
- Search merges materialized transcript text with the complete persisted session log and highlights keyword context. An unloaded result is still a one-selection jump.
- Deployments without a `sessionQuery` service degrade to loaded-content-only search without affecting timeline navigation.

### Layout, keyboard, and settings

- The active marker follows the viewport without dragging a reader back to the bottom while output streams. The rail also appears for one- and two-message sessions.
- Arrow keys move one Turn, Page Up / Page Down move one window, and Home / End reach either boundary, with `focus-visible` and `prefers-reduced-motion` support.
- **Show on right** mirrors the rail, edge guides, previews, search panel, and narrow-screen trigger while preserving the scrollbar and details resize boundary.
- Narrow screens use a collapsed entry point. Desktop no longer duplicates automatic paging with a manual ellipsis.
- Settings expose enable, flash-after-jump, side, edge offset, center offset, marker spacing, and Turns shown; preferences are persisted immediately to `settings.yaml`.

## Privacy

Prompt summaries, answer previews, and hover/focus state are computed from the official Chat snapshot in the current browser. Full-history search reads the persisted session log through the same-origin Host route `/codex-timeline/search`, which returns only the matching Turns' summaries and a bounded context window; nothing is sent to the model, telemetry, or any third party.

## Development and validation

```powershell
pnpm install
pnpm run check
pnpm pack --pack-destination artifacts
```

Validate a local tarball against a profile:

```powershell
dsh plugin --profile web add ".\artifacts\dsh-codex-timeline-0.5.2.tgz"
dsh --profile web --dump-config
```

`lib/client.js` is the SHA-256-pinned compatibility artifact generated for DSH `0.1.1-rc.2`. `scripts/prepare-dist.mjs` only normalizes package identity and local build paths; `scripts/verify-dist.mjs` checks its slot, observer, interaction, and hash contracts. `src/navigation-model.mjs` retains independently testable Turn projection, rail-window, jump-policy, and search logic. See [NOTICE](NOTICE) for upstream attribution.

## Upgrade audit

Never broaden the DSH peer range without a new audit. At minimum, run:

```powershell
dsh --version
dsh --profile web --dump-config
pnpm run check
pnpm pack --pack-destination artifacts
pnpm run test
```

Recheck:

1. the `ui-conversation` row and client module loader rules;
2. `ConversationTimelineSnapshot`, Chat snapshot, Turn locations, and stable node IDs;
3. the Chat scroll owner, history prepend, bottom-follow logic, and navigation slot;
4. settings scope, locale, and slot injection contracts;
5. real-browser behavior for light/dark themes, narrow screens, keyboard use, reduced motion, streaming, tool-heavy Turns, reconnects, and history loading.

If a capability changes, publish a separately verified adapter. Do not let this release replace an unknown Conversation implementation.

## License

[MIT](LICENSE). The package contains a `0.1.1-rc.2` compatibility adapter built from MIT-licensed DeepSeek Harness sources; see [NOTICE](NOTICE).
