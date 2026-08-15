# DSH Codex Timeline

English | [中文](README.md)

[![CI](https://github.com/Wine-Red/dsh-codex-timeline/actions/workflows/ci.yml/badge.svg)](https://github.com/Wine-Red/dsh-codex-timeline/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsh-codex-timeline.svg)](https://www.npmjs.com/package/dsh-codex-timeline)
[![license](https://img.shields.io/npm/l/dsh-codex-timeline.svg)](LICENSE)

A subtle user-Turn navigation rail attached to the left edge of the active DeepSeek Harness Web Chat transcript. It highlights the Turn at the reading position, jumps to any loaded prompt, and searches loaded prompts and model answers locally.

## Compatibility

This release supports only the following verified combination. It intentionally declares no broader compatibility range:

- DSH: `0.1.0-rc.6`
- Verified DSH commit: `47f943859bef60e4160492346772ded9b24f765a`
- Adapted package: `@deepseek-ai/dsh-client-ui-conversation@0.1.0-rc.6`
- Node.js: `^22.19.0 || >=24.0.0`

DSH rc.6 does not expose a public Chat gutter/navigation slot. This package uses the official `dsh.bundle.patch` mechanism to disable the fixed `ui-conversation` row and insert an exact rc.6 Conversation adapter. The adapter declares a controlled navigation slot and registers the timeline into it. It does not modify the global DSH installation.

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
- Searches loaded prompt and model-answer text locally, showing highlighted keyword context. Search data is never sent to the model or telemetry.
- Hides automatically below three user messages, unless earlier history still exists.
- Collapses on narrow screens without covering the composer or reducing message readability.
- Persists enablement, default visibility, density, and follow-highlight preferences through DSH settings.

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
dsh plugin --profile web add ".\artifacts\dsh-codex-timeline-0.1.0.tgz"
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
