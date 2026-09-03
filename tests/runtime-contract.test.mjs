import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Script, runInNewContext } from "node:vm";

const client = await readFile(
  new URL("../lib/client.js", import.meta.url),
  "utf8",
);

function clientHandoff(context = {}) {
  let handoff;
  const window = context.window ?? {};
  window.__ModuleLoader__ = {
    load(value) {
      handoff = value;
    },
  };
  runInNewContext(client, {
    ...context,
    window,
  });
  return handoff;
}

function clientPlugin(context = {}) {
  const handoff = clientHandoff(context);
  return handoff.factory((id) => {
    if (id === "react") return {};
    if (id === "react/jsx-runtime") return {};
    throw new Error(`unexpected runtime dependency: ${id}`);
  });
}

function browserContext() {
  return {
    console,
    document: {
      body: null,
      head: { appendChild() {} },
      querySelector: () => null,
      createElement: () => ({ dataset: {}, textContent: "" }),
    },
    fetch: async () => ({
      ok: true,
      json: async () => ({ ok: true, value: {} }),
    }),
    location: { origin: "http://dsh.internal" },
    URL,
  };
}

test("ships a syntactically valid DSH browser module", () => {
  assert.doesNotThrow(() => new Script(client, { filename: "lib/client.js" }));
  const handoff = clientHandoff();
  assert.equal(handoff.id, "dsh-codex-timeline");
  assert.equal(typeof handoff.factory, "function");
});

test("is an enhancer instead of a second Conversation or navigation rail", () => {
  for (const removed of [
    "AdditiveTurnNavigation",
    "MountedAdditiveTurnNavigation",
    "LegacyImageGallery",
    "createChatStore",
    "createPortal",
    "snapshot.chat",
    '"conversation.chat.navigation"',
    "ui-conversation/src",
    "ui-turn-navigation/src",
  ]) {
    assert.ok(!client.includes(removed), removed);
  }
  assert.match(client, /function officialNavigator\(\)/u);
  assert.match(
    client,
    /function enhanceOfficialNavigator\(preferences, favoritesOnly, items\)/u,
  );
  assert.match(client, /data-chat-flow/u);
  assert.match(client, /data-dsh-navigation-enhanced/u);
});

test("uses alpha3 public session actions for paging and branching", () => {
  assert.match(client, /session\.loadThrough\(seq\)/u);
  assert.match(
    client,
    /ctx\.sessions\.fork\(\{ sessionId, atSeq: seq, increaseTitle: true \}\)/u,
  );
  assert.match(client, /ctx\.sessions\.open\(childId\)/u);
  assert.doesNotMatch(client, /loadOlder\(/u);
});

test("keeps search, favorites, and branch actions keyboard reachable", () => {
  for (const marker of [
    "fetchTurnIndex",
    'type: "search"',
    'type: "button"',
    '"aria-expanded": searchExpanded',
    '"aria-pressed": favorite',
    '"aria-pressed": favoritesOnly',
    'role: "dialog"',
    'role: "alert"',
    'role: "status"',
    '"aria-live": "polite"',
    'event.key === "Escape"',
    "favoritesOnly",
    "branchSeq",
  ]) {
    assert.ok(client.includes(marker), marker);
  }
  assert.match(client, /No matches\. Try a shorter or different query\./u);
  assert.match(client, /没有匹配结果，请尝试更短或不同的关键词。/u);
  assert.match(client, /Could not branch from turn \{turn\}/u);
});

test("keeps corner controls and restores the rich interactive Turn preview", () => {
  for (const marker of [
    '"action.search"',
    '"action.favorites"',
    'className: "dsh-navx-preview"',
    "preview.runTime",
    "preview.ttft",
    "preview.tokensPerSecond",
    "preview.tokens",
    "useOfficialPreview",
    'role: "dialog"',
    "onBranch",
    "onFavorite",
    'className: "dsh-navx-previewInlineActions"',
    'className: "dsh-navx-previewInlineButton"',
    'className: "dsh-navx-previewStats"',
    "dshNavxStep",
    "dshNavigationInteracting",
  ]) {
    assert.ok(client.includes(marker), marker);
  }
  assert.match(client, /\.dsh-navx-root\{[^}]*position:fixed/u);
  assert.match(client, /\.dsh-navx-root\{[^}]*width:24px/u);
  assert.match(client, /\.dsh-navx-trigger\{[^}]*width:24px;height:24px/u);
  assert.match(client, /\.dsh-navx-trigger svg\{width:14px;height:14px/u);
  assert.match(client, /data-ready/u);
  assert.match(client, /data-side/u);
  assert.match(client, /dshNavxPreview/u);
  assert.match(client, /background:transparent/u);
  assert.match(client, /dshNavigationFilter/u);
  assert.doesNotMatch(client, /dsh-navx-badge/u);
  assert.doesNotMatch(client, /dsh-navx-previewActions/u);
  assert.doesNotMatch(client, /dsh-navx-previewMetrics/u);
  assert.doesNotMatch(client, /className: "dsh-navx-filter"/u);
  assert.match(client, /const edgeInset = 4/u);
  assert.match(client, /const controlSize = coarse \? 44 : 24/u);
  assert.match(
    client,
    /viewport\.left \+ scrollport\.clientWidth - controlSize - edgeInset/u,
  );
  assert.doesNotMatch(
    client,
    /const measuredNav = nav\?\.getBoundingClientRect/u,
  );
  assert.doesNotMatch(
    client,
    /const measuredSlot = nav\?\.parentElement\?\.getBoundingClientRect/u,
  );
  for (const [step, width] of [
    ["0", "30"],
    ["1", "24"],
    ["2", "18"],
    ["3", "12"],
  ]) {
    assert.ok(
      client.includes(
        `button[data-dsh-navx-step="${step}"]::before{width:${width}px!important`,
      ),
    );
  }
  assert.match(client, /Math\.abs\(index - activeIndex\)/u);
  assert.match(
    client,
    /nav\[data-dsh-navigation-enhanced=true\]\{width:36px;/u,
  );
  assert.match(
    client,
    /button\[data-dsh-navx-mark=true\]::before\{width:8px!important;background:var\(--dsw-alias-border-l4\)!important;opacity:\.55!important;transition:width \.18s[^}]*background-color \.16s[^}]*opacity \.16s/u,
  );
  assert.match(
    client,
    /:not\(\[data-dsh-navigation-interacting=true\]\) button\[aria-current=true\]::before\{background:var\(--dsw-alias-label-primary\)!important;opacity:\.72!important\}/u,
  );
  assert.doesNotMatch(client, /dsh-navx-peak-in/u);
  assert.doesNotMatch(client, /dshNavxFormerPeak/u);
  assert.doesNotMatch(
    client,
    /aria-current=true[^}]*transition:none!important/u,
  );
  assert.match(client, /let lastPointerY = null/u);
  assert.match(client, /const syncPointerToTrack = \(\) =>/u);
  assert.match(client, /nav\.addEventListener\("wheel", wheel/u);
  assert.doesNotMatch(client, /nav === null \|\| items\.length === 0/u);
  assert.match(client, /const itemByButton = new Map\(allButtons\.map/u);
  assert.match(client, /const buttons = allButtons\.filter/u);
  assert.doesNotMatch(client, /dsh-navx-highlight/u);
  assert.doesNotMatch(client, /positionHighlight/u);
  assert.match(
    client,
    /button\[data-dsh-navx-step="0"\]::before\{[^}]*background:var\(--dsw-alias-label-primary\)!important;opacity:\.9!important/u,
  );
});

test("preserves all personalized navigation settings", () => {
  for (const key of [
    "enabled",
    "favorites",
    "side",
    "leftOffset",
    "centerOffset",
    "markerSpacing",
    "recentTurns",
  ]) {
    assert.match(client, new RegExp(`\\b${key}\\b`, "u"), key);
  }
  assert.match(client, /restoreOfficialNavigator/u);
  assert.match(client, /--turn-natural-position/u);
  assert.match(client, /--turn-natural-height/u);
  assert.match(client, /prefers-reduced-motion/u);
  assert.doesNotMatch(
    client,
    /landingFlash|dsh-nav-enhancer-landed|flashTurnRow/u,
  );
});

test("keeps the standalone disclosure card and live slider controls", () => {
  for (const marker of [
    'jsxs("li", { className: "dsh-navx-settingsCard"',
    '"aria-expanded": open',
    'role: "switch"',
    'type: "range"',
    "htmlFor: inputId",
    "settings.overridden",
    "settings.reset",
  ]) {
    assert.ok(client.includes(marker), marker);
  }
  assert.doesNotMatch(client, /type: "number"/u);
  assert.match(client, /onInput: updateDraft/u);
  assert.match(client, /onPointerUp: commit/u);
  assert.match(client, /onKeyUp: commit/u);
  assert.match(client, /requestAnimationFrame/u);
  assert.match(client, /previewOfficialRangePreference/u);
  assert.doesNotMatch(client, /onChange: \(event\) => setPreference/u);
});

test("mirrors official marks and previews with the selected edge", () => {
  assert.match(client, /data-dsh-navigation-side=left/u);
  assert.match(client, /data-dsh-navigation-side=right/u);
  assert.match(client, /data-dsh-navx-mark=true/u);
  assert.match(client, /\[role=tooltip\]/u);
  assert.match(client, /inset:0 auto 0 0/u);
  assert.match(client, /inset:0 0 0 auto/u);
  assert.match(client, /mark\.dataset\.dshNavxMark = "true"/u);
});

test("disabling enhancements leaves restored official geometry intact", () => {
  assert.match(client, /if \(!owned\) return;/u);
  assert.match(client, /if \(preferences\.enabled !== true\) return nav;/u);
  assert.doesNotMatch(
    client,
    /if \(preferences\.enabled !== true\) \{\s*restoreOfficialNavigator/u,
  );
});

test("registers only the settings card and header enhancement slots", async () => {
  const plugin = clientPlugin(browserContext());
  const registrations = [];
  const errors = [];
  const ctx = {
    locale: { register: () => () => undefined },
    logger: { error: (message) => errors.push(message) },
    effect: (install) => install(),
    slots: {
      inject: (_name, install) => install(),
      register: (spec, component) => {
        registrations.push({ spec, component });
        return () => undefined;
      },
    },
    sessions: {},
  };

  plugin.apply(ctx);
  await Promise.resolve();

  assert.deepEqual(
    registrations.map(({ spec }) => spec.name),
    ["settings.plugin.item", "conversation.session.header.actions"],
  );
  assert.deepEqual(errors, []);
});

test("isolates an unavailable optional slot without blocking the other", async () => {
  const handoff = clientHandoff(browserContext());
  const plugin = handoff.factory((id) => {
    if (id === "react") return {};
    if (id === "react/jsx-runtime") return {};
    throw new Error(id);
  });
  const errors = [];
  let registrations = 0;
  const ctx = {
    locale: { register: () => () => undefined },
    logger: { error: (message) => errors.push(message) },
    effect: (install) => install(),
    slots: {
      inject: (_name, install) => install(),
      register: () => {
        registrations += 1;
        if (registrations === 1) throw new Error("simulated conflict");
        return () => undefined;
      },
    },
    sessions: {},
  };

  assert.doesNotThrow(() => plugin.apply(ctx));
  await Promise.resolve();
  assert.equal(registrations, 2);
  assert.ok(
    errors.some((message) =>
      message.includes("settings.plugin.item contribution disabled"),
    ),
  );
});
