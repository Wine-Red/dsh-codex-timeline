import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Script, runInNewContext } from "node:vm";

const client = await readFile(
  new URL("../lib/client.js", import.meta.url),
  "utf8",
);

test("ships a syntactically valid client bundle", () => {
  assert.doesNotThrow(() => new Script(client, { filename: "lib/client.js" }));
});

test("hands the expected module factory to the DSH loader", () => {
  let handoff;
  runInNewContext(client, {
    window: {
      __ModuleLoader__: {
        load(value) {
          handoff = value;
        },
      },
    },
  });
  assert.equal(handoff?.id, "dsh-codex-timeline");
  assert.equal(typeof handoff?.factory, "function");
});

test("declares an owned single-session navigation slot and registers the feature", () => {
  assert.match(
    client,
    /"conversation\.chat\.navigation": \{\s*kind: "single",\s*scope: "session"/u,
  );
  assert.match(client, /ctx\.slots\.inject\("conversation\.chat\.navigation"/u);
});

test("uses observer-backed geometry and cleans up scheduled work", () => {
  assert.match(client, /new IntersectionObserver/u);
  assert.match(client, /new ResizeObserver/u);
  assert.match(client, /cancelAnimationFrame/u);
  assert.doesNotMatch(client, /MutationObserver/u);
});

test("keeps paging, keyboard, reduced-motion, search, and settings contracts", () => {
  for (const value of [
    "loadOlderAnchored",
    'event.key === "ArrowUp"',
    'event.key === "Enter"',
    'event.key === " "',
    "prefers-reduced-motion:reduce",
    "timeline.search.noneEarlier",
    "settings.followHighlight",
    "items.length < 3 && !hasMore",
  ]) {
    assert.ok(client.includes(value), value);
  }
});

test("auto-loads older history every 80ms until the transcript is complete", () => {
  for (const value of [
    "autoLoadTimerRef",
    "loadOlderRef",
    "window.setTimeout",
    "}, 80);",
    "failed to auto-load older history",
  ]) {
    assert.ok(client.includes(value), value);
  }
  assert.doesNotMatch(client, /codex-timeline\/history-index/u);
});

test("keeps current and disclosed marker states visually distinct", () => {
  assert.ok(
    client.includes(
      ".RhpIHW_markerSlot:hover .RhpIHW_mark,.RhpIHW_markerSlot:focus-within .RhpIHW_mark{width:39px",
    ),
  );
  assert.ok(
    client.includes(".RhpIHW_active .RhpIHW_mark{width:9px;height:3px"),
  );
  assert.doesNotMatch(
    client,
    /\.RhpIHW_active \.RhpIHW_mark,\.RhpIHW_markerSlot:hover/u,
  );
  assert.match(client, /const showCurrent = current && hoveredId === null/u);
  assert.match(
    client,
    /showCurrent && TurnNavigation_module_css_default\.active/u,
  );
  assert.doesNotMatch(client, /const highlightedId/u);
});

test("leaves a bridged gap between an expanded marker and its tooltip", () => {
  assert.ok(
    client.includes(
      ".RhpIHW_tooltip{left:calc(100% + 24px)}.RhpIHW_markerSlot::after{width:24px}",
    ),
  );
});

test("keeps dated tooltip metadata on one line", () => {
  for (const value of [
    ".RhpIHW_tooltip{width:min(320px,100vw - 96px)}",
    ".RhpIHW_tooltipMeta{gap:6px;white-space:nowrap}",
    ".RhpIHW_tooltipMeta>strong,.RhpIHW_tooltipMeta>span{flex:none}",
  ]) {
    assert.ok(client.includes(value), value);
  }
});

test("renders answer previews as strict two-line plain text", () => {
  assert.ok(
    client.includes(
      ".RhpIHW_answer{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;max-height:32px;white-space:pre-line;overflow:hidden}",
    ),
  );
  assert.match(
    client,
    /className: TurnNavigation_module_css_default\.answer,\s+children: item\.answer/u,
  );
});
