# DSH Codex Timeline

English | [中文](README.md)

[![CI](https://github.com/Wine-Red/dsh-codex-timeline/actions/workflows/ci.yml/badge.svg)](https://github.com/Wine-Red/dsh-codex-timeline/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsh-codex-timeline.svg)](https://www.npmjs.com/package/dsh-codex-timeline)
[![license](https://img.shields.io/github/license/Wine-Red/dsh-codex-timeline.svg)](LICENSE)

DSH Codex Timeline enhances the official DeepSeek Harness Web turn navigator. DSH introduced native turn navigation in the `0.1.2` series. Starting with plugin version `0.6.0`, the plugin no longer renders a second timeline or bundles a copy of Conversation or `TurnNavigator`; DSH itself owns the Codex-style dashes, base states, and native interaction.

The plugin adds the capabilities the official navigator does not yet provide: complete-session search, favorites, branching from a selected Turn, a time-and-token-rich Turn preview, and the existing personalization controls.

> [!IMPORTANT]
> The current `0.6.x` release supports DSH `0.1.2-alpha.3` only. Use plugin version `0.5.5` with earlier DSH releases.

## Features

- Enhances DSH's native turn navigator with a staircase wave and highlight motion.
- Saves favorite Turns and filters the navigator to favorites.
- Searches the complete conversation and jumps directly to a selected Turn.
- Previews Turn content, time, and token information.
- Creates a new branch from a completed Turn.
- Customizes the navigator side, offsets, marker spacing, and number of visible Turns.

## Preview

### Idle

<table>
  <thead><tr><th>Light theme</th><th>Dark theme</th></tr></thead>
  <tbody><tr>
    <td><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/timeline-default-dsh.png" width="470" alt="Timeline idle state in the light theme" /></td>
    <td><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/timeline-default-dsh-dark.png" width="470" alt="Timeline idle state in the dark theme" /></td>
  </tr></tbody>
</table>

### Hover and Turn preview

<table>
  <thead><tr><th>Light theme</th><th>Dark theme</th></tr></thead>
  <tbody><tr>
    <td><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/timeline-hover-dsh.png" width="470" alt="Timeline staircase wave and Turn preview in the light theme" /></td>
    <td><img src="https://raw.githubusercontent.com/Wine-Red/dsh-codex-timeline/main/docs/images/timeline-hover-dsh-dark.png" width="470" alt="Timeline staircase wave and Turn preview in the dark theme" /></td>
  </tr></tbody>
</table>

## Compatibility

DSH introduced a native turn navigator in the `0.1.2` series. Since `0.6.0`, this plugin enhances that native navigator with search, favorites, branching, previews, staircase motion, and layout customization instead of creating a separate timeline.

- DSH `0.1.2-alpha.3`: use the current plugin `0.6.x`.
- Earlier DSH releases: use plugin `0.5.5`, which provides the complete standalone timeline.

Install the legacy plugin by specifying its npm version:

```powershell
dsh plugin --profile web add "dsh-codex-timeline@0.5.5"
```

You can also download the [`v0.5.5` source archive](https://github.com/Wine-Red/dsh-codex-timeline/archive/refs/tags/v0.5.5.zip). The `install.ps1` script on the current branch is only for DSH `0.1.2-alpha.3`; do not use it to install the legacy plugin.

## Installation

The following steps apply only to DSH `0.1.2-alpha.3`. For earlier DSH releases, install plugin version `0.5.5` as described above.

Confirm the installed runtime first:

```powershell
dsh --version
```

Install the npm release:

```powershell
.\install.ps1 -Profile web -Source dsh-codex-timeline
```

For local development, link this checkout directly:

```powershell
.\install.ps1 -Profile web -Source "E:\Program\DSH_plugin\dsh-codex-timeline"
```

Restart DSH Web and refresh the browser. Preferences live under Settings → Plugins → Plugin configuration → Official turn navigation enhancements.

## Privacy

Complete-history search reads the current conversation through the same-origin Host route `/codex-timeline/search` and returns only Turn summaries, bounded context, and time/token metrics already present in the local log. Search text, favorites, and interaction state are not sent to the model, telemetry, or third parties.

## Development and validation

```powershell
pnpm install
pnpm run check
pnpm pack --pack-destination artifacts
```

`scripts/verify-dist.mjs` prevents the old Conversation copy, custom navigation seat, Portal, private runtime dependencies, or local machine paths from re-entering the package. It also verifies the alpha.3 slot, session API, settings, and branch-anchor contracts.

## License

[MIT](LICENSE). This release no longer redistributes the official Conversation or `TurnNavigator`; see [NOTICE](NOTICE) for interoperability and attribution details.
