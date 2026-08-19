# DSH Codex Timeline

English | [中文](README.md)

<p align="center">
  <img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/v0.2.0/docs/images/cover.png" width="960" alt="DSH Codex Timeline cover showing the turn rail, preview, and search" />
</p>

[![CI](https://github.com/Wine-Red/dsh-codex-timeline/actions/workflows/ci.yml/badge.svg)](https://github.com/Wine-Red/dsh-codex-timeline/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsh-codex-timeline.svg)](https://www.npmjs.com/package/dsh-codex-timeline)
[![license](https://img.shields.io/github/license/Wine-Red/dsh-codex-timeline.svg)](LICENSE)

A subtle user-Turn navigation rail attached to the left edge of the active DeepSeek Harness Web Chat transcript. It highlights the Turn at the reading position, jumps between prompts, and can automatically materialize every historical Turn and preview.

## Interface tour

The rail stays quiet by default: each loaded user Turn is one short dash, and only the current reading position is highlighted. On hover, nearby markers expand into a stepped shape for accurate selection, then return to their compact state when the pointer leaves.

<p align="center">
  <img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/v0.2.0/docs/images/feature-preview.en.svg" width="960" alt="Turn preview and local search shown with test copy" />
</p>

> Every prompt, answer, metric, and search result in the illustration and DSH captures below is dedicated test copy. No real conversation content is used.

Both images below were captured from DSH `0.1.0-rc.6` with this plugin installed. They show the same real rail in its compact and pointer-hover states:

<table>
  <tr>
    <th>Compact</th>
    <th>Hover expansion</th>
  </tr>
  <tr>
    <td align="center"><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/v0.2.0/docs/images/timeline-default-dsh.png" width="460" alt="Compact Turn rail captured from DSH" /></td>
    <td align="center"><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/v0.2.0/docs/images/timeline-hover-dsh.png" width="460" alt="Hover-expanded Turn rail and test preview captured from DSH" /></td>
  </tr>
  <tr>
    <td>Low contrast without reducing transcript width</td>
    <td>Pointer-following highlight that restores the current Turn on leave</td>
  </tr>
</table>

The feature illustration summarizes the real interaction: hovering reveals Turn position, status, duration, TTFT, throughput, prompt, and model-answer context. Search shows each keyword in context and jumps directly to the matching Turn.

### Typical flow

1. Scroll the transcript and let the rail track the current Turn.
2. Hover for two prompt lines and two answer lines; click or press Enter / Space to jump.
3. Enable “Automatically load full history” to call DSH's existing history pager every 80 ms until every older Turn is materialized.

## Compatibility

This release supports only the following verified combinations. It intentionally declares no broader compatibility range:

- Verified DSH: `0.1.0-rc.7`, `0.1.0-rc.8`
- Verified rc.7 commit: `99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`
- Node.js: `^22.19.0 || >=24.0.0`

The plugin no longer disables or replaces the official `ui-conversation`. DSH rc.7/rc.8 do not yet expose a dedicated Chat navigation slot, so the plugin uses the additive `conversation.session.header.actions` lifecycle seat and the stable `data-chat-flow` / `data-chat-anchor-key` DOM contracts shared by both versions to mount the original 0.3.2 timeline at the Chat root. The rc.8 image adaptation also leaves Conversation ownership untouched.

Adapter, Host, settings, or slot registration failures disable and log only the timeline. DSH continues to own and render the session list, conversation body, and composer.

Do not force-install this release on another DSH version. Remove it before upgrading DSH and repeat the contract audit described below.

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

- Creates one marker only for a real user Turn. Tool calls, approval UI, plan UI, subagents, and assistant streaming chunks do not create noisy markers.
- Tracks the current viewport Turn without pulling a reader back to the bottom while output streams.
- Expands nearby short bars into a stepped shape on hover and temporarily follows the pointer; leaving restores the viewport highlight.
- Shows item x/y, time, status, two prompt lines, two model-answer lines, and real Turn duration, TTFT, and tok/s when available.
- Supports click, Enter, Space, arrow keys, Home, End, `focus-visible`, and `prefers-reduced-motion`.
- Reuses the official DSH history loader behind a compact top ellipsis; stable node IDs preserve the reader anchor after a prepend.
- “Automatically load full history” repeatedly calls DSH's native history pager at 80 ms intervals until the complete old transcript is rendered in Chat.
- Searches available Turn previews and materialized transcript text locally, showing highlighted keyword context. Search data is never sent to the model or telemetry.
- Hides automatically below three user messages, unless earlier history still exists.
- Collapses on narrow screens without covering the composer or reducing message readability.
- The settings page (Settings → Plugins → Plugin configuration) offers an enable toggle, “Automatically load full history,” and three position/spacing sliders; every preference is written through to the DSH settings document (settings.yaml) immediately and survives reloads and browser switches.
- The top-left ⋮ / search controls stay anchored; the position sliders move only the marker column.

## Privacy

Prompt summaries, answer previews, search indexes, and hover/focus state are computed from the official Chat snapshot in the current browser. The plugin adds no model context, network request, or telemetry event.

## Development and validation

```powershell
pnpm install
pnpm run check
pnpm pack --pack-destination artifacts
```

Validate a local tarball against a profile:

```powershell
dsh plugin --profile web add ".\artifacts\dsh-codex-timeline-0.2.0.tgz"
dsh --profile web --dump-config
```

`lib/client.js` is the SHA-256-pinned compatibility artifact generated for rc.6. `scripts/prepare-dist.mjs` only normalizes package identity and local build paths; `scripts/verify-dist.mjs` checks its slot, observer, interaction, and hash contracts. `src/navigation-model.mjs` retains independently testable Turn projection and search logic. See [NOTICE](NOTICE) for upstream attribution.

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

[MIT](LICENSE). The package contains an rc.6 compatibility adapter built from MIT-licensed DeepSeek Harness sources; see [NOTICE](NOTICE).
