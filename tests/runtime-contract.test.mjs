import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { Script, runInNewContext } from "node:vm";
import {
  advanceJumpPagingProgress as sourceAdvanceJumpPagingProgress,
  accumulateRailWheel as sourceAccumulateRailWheel,
  classifyRailMotion as sourceClassifyRailMotion,
  deriveRailBand as sourceDeriveRailBand,
  deriveRailGeometry as sourceDeriveRailGeometry,
  deriveRailWindow as sourceDeriveRailWindow,
  railSlotAtPointer as sourceRailSlotAtPointer,
  railWindowStartForIndex as sourceRailWindowStartForIndex,
  resolveJumpBehavior as sourceResolveJumpBehavior,
  resolveJumpSettle as sourceResolveJumpSettle,
  resolveRailWheel as sourceResolveRailWheel,
  shouldRenderRailSurface as sourceShouldRenderRailSurface,
  stepRailWindow as sourceStepRailWindow,
} from "../src/navigation-model.mjs";

const client = await readFile(
  new URL("../lib/client.js", import.meta.url),
  "utf8",
);

function clientFactory() {
  let handoff;
  runInNewContext(client, {
    console,
    fetch: async () => ({ json: async () => ({ ok: true, value: {} }) }),
    queueMicrotask,
    window: {
      __ModuleLoader__: {
        load(value) {
          handoff = value;
        },
      },
    },
  });
  return handoff.factory;
}

function universalModuleStub() {
  const callable = function () {
    return proxy;
  };
  const proxy = new Proxy(callable, {
    apply() {
      return proxy;
    },
    construct() {
      return proxy;
    },
    get(target, property) {
      if (property === "prototype") return target.prototype;
      if (property === Symbol.iterator)
        return function* iterator() {
          return undefined;
        };
      return proxy;
    },
  });
  return proxy;
}

function bundledRailModel() {
  const start = client.indexOf("\t\tconst RAIL_WINDOW_DEFAULT");
  const end = client.indexOf("\t\tfunction positionLabel", start);
  assert.ok(start >= 0 && end > start, "bundled rail helpers are extractable");
  const block = client.slice(start, end);
  return runInNewContext(`(() => {
${block}
return { accumulateRailWheel, advanceJumpPagingProgress, classifyRailMotion, deriveRailBand, deriveRailGeometry, deriveRailWindow, railSlotAtPointer, railWindowStartForIndex, resolveJumpBehavior, resolveJumpSettle, resolveRailWheel, shouldRenderRailSurface, stepRailWindow };
})()`);
}

const plain = (value) => JSON.parse(JSON.stringify(value));

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

test("an additive slot conflict fails open during real apply", async () => {
  const stub = universalModuleStub();
  const plugin = clientFactory()(() => stub);
  const warnings = [];
  const errors = [];
  let registrations = 0;
  const ctx = {
    conversationEvents: { entries: () => [{}] },
    conversationViews: { entries: () => [] },
    get: () => ({}),
    locale: { register: () => () => undefined },
    logger: {
      error: (message) => errors.push(message),
      warn: (message) => warnings.push(message),
    },
    effect: (install) => install(),
    slots: {
      inject: (_name, install) => install(),
      register: () => {
        registrations += 1;
        if (registrations === 1) throw new Error("simulated slot conflict");
        return () => undefined;
      },
      snapshot: () => [{ kind: "single", scope: "session" }],
      spec: () => ({ kind: "single", scope: "session" }),
    },
  };

  assert.doesNotThrow(() => plugin.apply(ctx));
  await Promise.resolve();
  assert.equal(registrations, 2, JSON.stringify({ errors, warnings }));
  assert.deepEqual(warnings, []);
  assert.ok(
    errors.some((message) =>
      message.includes("settings.plugin.item contribution disabled"),
    ),
  );
});

test("uses the official lifecycle seat and stable chat anchors", () => {
  assert.match(
    client,
    /safeSlotInject\(ctx, "conversation\.session\.header\.actions"/u,
  );
  assert.match(client, /document\.querySelector\("\[data-chat-flow\]"\)/u);
  assert.match(client, /querySelectorAll\("\[data-chat-anchor-key\]"\)/u);
  assert.match(client, /react_dom\.createPortal/u);
});

test("uses observer-backed geometry and cleans up scheduled work", () => {
  assert.match(client, /new IntersectionObserver/u);
  assert.match(client, /new ResizeObserver/u);
  assert.match(client, /cancelAnimationFrame/u);
  assert.doesNotMatch(client, /MutationObserver/u);
});

test("keeps viewport geometry when a filter has no materialized anchors", () => {
  for (const value of [
    "const keepViewportRef = (0, react.useRef)(false)",
    "trackedKeys.current.size === 0 && !keepViewportRef.current",
    "trackAnchors: (0, react.useCallback)((keys, keepViewport = false)",
    "keepViewportRef.current = keepViewport",
    "if (keepViewport) scheduleMeasure(true)",
    "const shouldRenderRail = shouldRenderRailSurface(preferences.enabled, favoritesOnly, located.length, hasMore)",
    "trackAnchors([], false)",
    "if (!shouldRenderRail) return null",
  ]) {
    assert.ok(client.includes(value), value);
  }
  assert.match(
    client,
    /trackAnchors\(shouldRenderRail \? visibleItems\.flatMap[\s\S]*?, shouldRenderRail\)/u,
  );
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
    "shouldRenderRailSurface",
  ]) {
    assert.ok(client.includes(value), value);
  }
  assert.doesNotMatch(
    client,
    /items\.length < 3 && !hasMore/u,
    "the timeline must not hide itself for short sessions",
  );
});

test("coordinates adaptive jumps with DSH-style prepend anchoring and landing verification", () => {
  for (const value of [
    "const pagingRestoreRef = (0, react.useRef)(null)",
    "const capturePagingAnchor = (0, react.useCallback)",
    "loadOlder: loadOlderAnchored",
    "scrollport.scrollTop += flowTop(row, scrollport) - saved.top",
    "const scrollRequestRef = (0, react.useRef)(0)",
    "const manualScrollRef = (0, react.useRef)(0)",
    "cancelScroll: (0, react.useCallback)",
    "cancelScroll();",
    "manualScrollVersion() !== jumpRequest.manualScrollVersion",
    "function resolveJumpBehavior",
    "function resolveJumpSettle",
    "options.loadedPages ?? 0",
    "const beforeTarget = Math.max(0, Math.min(limit(), top - settle.offset))",
    "const eased = 1 - Math.pow(1 - progress, 3)",
    "(performance.now() - startedAt) / settle.duration",
    "performance.now() - startedAt < 900",
    "stableFrames = error <= 2 ? stableFrames + 1 : 0",
    'element.setAttribute("data-dsh-codex-timeline-landed", "true")',
    "jumpRequest.pages >= 400",
    "progress.stalls >= 5",
    "advanceJumpPagingProgress(progress",
    "anchorCount: materializedAnchorCount()",
    'role: "status"',
    '"aria-live": "polite"',
    '"data-turn-nav-jump": markerJumpState ?? void 0',
    "const jumpNoticeTimerRef = (0, react.useRef)(null)",
    "}, 300)",
    'className: "RhpIHW_jumpNotice"',
    '"timeline.jump.loadingProgress"',
    '"timeline.jump.landed"',
    '"timeline.jump.failed"',
  ]) {
    assert.ok(client.includes(value), value);
  }
  assert.doesNotMatch(client, /const \[pendingJumpId/u);
  assert.doesNotMatch(client, /setPendingJumpId/u);
  assert.doesNotMatch(client, /gave up after 30 pages/u);
  assert.doesNotMatch(client, /nodes\.size > progress\.lastNodeCount/u);
});

test("keeps the navigation portal mounted while history pages prepend", () => {
  const start = client.indexOf("function AdditiveTurnNavigation");
  const end = client.indexOf("function apply$1", start);
  const additive = client.slice(start, end);
  for (const value of [
    "const registeredAnchorsRef = (0, react.useRef)",
    "const syncNavigationAnchors = (0, react.useCallback)",
    "registeredAnchorsRef.current = next",
    "}, [sessionId, navigation.registerAnchor])",
    "}, [order, syncNavigationAnchors])",
  ]) {
    assert.ok(additive.includes(value), value);
  }
  assert.doesNotMatch(
    additive,
    /sessionId,\s*order,\s*navigation\.registerAnchor/u,
    "order changes must update anchors without remounting the portal",
  );
});

test("removed auto-load-all and made the recent-turns count a setting", () => {
  for (const dropped of [
    "autoLoadTimerRef",
    "loadOlderRef",
    "settings.autoLoadAll",
    "failed to auto-load older history",
    "autoLoadAll: false",
  ]) {
    assert.ok(!client.includes(dropped), dropped);
  }
  assert.match(client, /preferences\.recentTurns \?\? 25/u);
  assert.match(client, /"settings\.recentTurns"/u);
  assert.doesNotMatch(client, /codex-timeline\/history-index/u);
});

test("persists an opt-in right side and mirrors the complete interaction surface", () => {
  for (const value of [
    'const railSide = preferences.side === "right" ? "right" : "left"',
    '"data-turn-nav-side": railSide',
    'side: "left"',
    'checked: settings.side === "right"',
    'setPreference("side", value ? "right" : "left")',
    'side: clean.side === "right" ? "right" : "left"',
    "next.side === this.snapshot.side",
    '"settings.showOnRight"',
    '"settings.showOnRightHint"',
  ]) {
    assert.ok(client.includes(value), value);
  }

  for (const value of [
    '.RhpIHW_host[data-turn-nav-side=\\"right\\"]{--turn-nav-right-safe-inset:max(var(--dsh-scrollbar-width, 8px),env(safe-area-inset-right, 0px))}',
    '.RhpIHW_host[data-turn-nav-side=\\"right\\"] .RhpIHW_rail{left:auto;right:calc(-4px + var(--turn-nav-right-safe-inset));pointer-events:none}',
    '.RhpIHW_host[data-turn-nav-side=\\"right\\"] .RhpIHW_rail>:is(.RhpIHW_railClose,.RhpIHW_searchTrigger,.RhpIHW_favoriteTrigger,.RhpIHW_searchPanel,.RhpIHW_track){pointer-events:auto}',
    '.RhpIHW_host[data-turn-nav-side=\\"right\\"] .RhpIHW_rail .RhpIHW_track{left:auto;right:calc(var(--turn-nav-left, 0px) + 4px);width:38px}',
    '.RhpIHW_host[data-turn-nav-side=\\"right\\"] .RhpIHW_marker{left:auto;right:0}',
    '.RhpIHW_host[data-turn-nav-side=\\"right\\"] .RhpIHW_mark{left:auto;right:12px;transform-origin:right center}',
    '.RhpIHW_host[data-turn-nav-side=\\"right\\"] .RhpIHW_railPreviewSlot[data-turn-nav-peek-depth=\\"1\\"] .RhpIHW_railPeekMark{left:auto;right:13px}',
    '.RhpIHW_host[data-turn-nav-side=\\"right\\"] .RhpIHW_railPreviewSlot[data-turn-nav-peek-depth=\\"2\\"] .RhpIHW_railPeekMark{left:auto;right:14px}',
    '.RhpIHW_host[data-turn-nav-side=\\"right\\"] .RhpIHW_desktopTrigger{left:auto;right:var(--turn-nav-right-safe-inset)}',
    '.RhpIHW_host[data-turn-nav-side=\\"right\\"] .RhpIHW_mobileTrigger{left:auto;right:max(8px,env(safe-area-inset-right, 0px))}',
    '[data-details-collapsed] .RhpIHW_host[data-turn-nav-side=\\"right\\"]{--turn-nav-right-safe-inset:max(0px,env(safe-area-inset-right, 0px))}',
    '.RhpIHW_host[data-turn-nav-side=\\"right\\"] .RhpIHW_tooltip{left:auto;right:calc(100% + 24px)}',
    '.RhpIHW_host[data-turn-nav-side=\\"right\\"] :is(.RhpIHW_markerSlot,.RhpIHW_railPreviewSlot)::after{left:auto;right:100%}',
    '.RhpIHW_host[data-turn-nav-side=\\"right\\"] :is(.RhpIHW_searchTrigger,.RhpIHW_favoriteTrigger){left:auto;right:7px}',
    '.RhpIHW_host[data-turn-nav-side=\\"right\\"] .RhpIHW_railClose{left:auto;right:28px}',
    '.RhpIHW_host[data-turn-nav-side=\\"right\\"] .RhpIHW_searchPanel{left:auto;right:42px}',
  ]) {
    assert.ok(client.includes(value), value);
  }

  assert.ok(client.includes(".RhpIHW_rail{left:-4px}"));
  assert.doesNotMatch(client, /scaleX\(-1\)/u);
});

test("removes the redundant desktop load-earlier control without removing automatic paging", () => {
  const desktopRailStart = client.indexOf("railVisible &&");
  const desktopRailEnd = client.indexOf("drawerOpen &&", desktopRailStart);
  assert.ok(desktopRailStart >= 0 && desktopRailEnd > desktopRailStart);

  const desktopRail = client.slice(desktopRailStart, desktopRailEnd);
  assert.doesNotMatch(
    desktopRail,
    /TurnNavigation_module_css_default\.earlier/u,
  );
  assert.doesNotMatch(client, /const (?:unloadedCount|earlierLabel)\b/u);
  assert.doesNotMatch(client, /"timeline\.earlierCount"/u);
  assert.ok(client.includes("const railTrackTop = 52"));
  assert.ok(client.includes("loadOlder: loadOlderAnchored"));
  assert.ok(client.includes("TurnNavigation_module_css_default.drawerEarlier"));
});

test("uses a fixed logical rail window with one-item wheel steps", () => {
  for (const value of [
    "function deriveRailWindow",
    "function stepRailWindow",
    "function railWindowStartForIndex",
    "function accumulateRailWheel",
    "function resolveRailWheel",
    "const [railWindowAnchorId, setRailWindowAnchorId]",
    'track.addEventListener("wheel", onRailWheel, { passive: false })',
    "resolution.shouldPreventDefault",
    "event.preventDefault()",
    "target.closest(`.${TurnNavigation_module_css_default.tooltip}`)",
    '"aria-description": t("timeline.scrollHint")',
  ]) {
    assert.ok(client.includes(value), value);
  }
  assert.match(
    client,
    /ref: railTrackRef,\s+className: TurnNavigation_module_css_default\.track/u,
  );
  assert.doesNotMatch(
    client,
    /className: TurnNavigation_module_css_default\.rail,\s+onWheel/u,
  );
  assert.doesNotMatch(client, /\.RhpIHW_track\{[^}]*overflow-y:auto/u);
});

test("published rail helpers match the behavior-tested source model", () => {
  const bundled = bundledRailModel();
  const entries = Array.from({ length: 60 }, (_, index) => ({
    item: { id: `turn:${index + 1}` },
  }));

  for (const anchor of [null, "turn:1", "turn:22", "turn:missing"]) {
    assert.deepEqual(
      plain(bundled.deriveRailWindow(entries, 25, anchor)),
      plain(sourceDeriveRailWindow(entries, 25, anchor)),
    );
  }
  assert.deepEqual(
    plain(
      bundled.deriveRailBand(bundled.deriveRailWindow(entries, 25, "turn:22")),
    ),
    plain(sourceDeriveRailBand(sourceDeriveRailWindow(entries, 25, "turn:22"))),
  );
  for (const clientY of [99, 100, 114.999, 115, 474.999, 475]) {
    assert.equal(
      bundled.railSlotAtPointer(clientY, 100, 0, 15, 25),
      sourceRailSlotAtPointer(clientY, 100, 0, 15, 25),
    );
  }
  for (const args of [
    [true, false, 1, false],
    [true, true, 0, false],
    [true, false, 0, true],
    [true, false, 0, false],
    [false, true, 1, true],
  ]) {
    assert.equal(
      bundled.shouldRenderRailSurface(...args),
      sourceShouldRenderRailSurface(...args),
    );
  }
  const progress = {
    firstKey: "node-900",
    orderLength: 100,
    anchorCount: 105,
    stalls: 2,
  };
  for (const snapshot of [
    { firstKey: "node-700", orderLength: 100, anchorCount: 105 },
    { firstKey: "node-900", orderLength: 120, anchorCount: 105 },
    { firstKey: "node-900", orderLength: 100, anchorCount: 433 },
    { firstKey: "node-900", orderLength: 100, anchorCount: 105 },
  ]) {
    assert.equal(
      JSON.stringify(bundled.advanceJumpPagingProgress(progress, snapshot)),
      JSON.stringify(sourceAdvanceJumpPagingProgress(progress, snapshot)),
    );
  }
  for (const [previous, current] of [
    [Number.NEGATIVE_INFINITY, 0],
    [0, 119],
    [0, 120],
    [120, 100],
  ]) {
    assert.equal(
      bundled.classifyRailMotion(previous, current),
      sourceClassifyRailMotion(previous, current),
    );
  }
  assert.deepEqual(
    plain(bundled.deriveRailGeometry(360, 25, 15, 2)),
    plain(sourceDeriveRailGeometry(360, 25, 15, 2)),
  );
  for (const direction of [-100, -1, 0, 1, 100]) {
    assert.equal(
      bundled.stepRailWindow(12, entries.length, 25, direction),
      sourceStepRailWindow(12, entries.length, 25, direction),
    );
  }
  for (const index of [0, 9, 10, 34, 35, 59]) {
    assert.equal(
      bundled.railWindowStartForIndex(10, index, entries.length, 25),
      sourceRailWindowStartForIndex(10, index, entries.length, 25),
    );
  }
  for (const args of [
    [200, 800, false, 0],
    [1201, 800, false, 0],
    [200, 800, true, 0],
    [200, 800, false, 1],
  ]) {
    assert.equal(
      bundled.resolveJumpBehavior(...args),
      sourceResolveJumpBehavior(...args),
    );
  }
  for (const args of [
    [1201, 800, false, 0],
    [-1201, 800, false, 0],
    [200, 400, false, 1],
    [1200, 800, false, 0],
    [1201, 800, true, 0],
  ]) {
    assert.equal(
      JSON.stringify(bundled.resolveJumpSettle(...args)),
      JSON.stringify(sourceResolveJumpSettle(...args)),
    );
  }

  let sourceGesture;
  let bundledGesture;
  for (const input of [
    { deltaY: 20, timeStamp: 0 },
    { deltaY: 90, timeStamp: 16 },
    { deltaY: 100, timeStamp: 24 },
    { deltaX: 20, deltaY: 10, timeStamp: 32 },
    { deltaY: -12, timeStamp: 48 },
  ]) {
    sourceGesture = sourceAccumulateRailWheel(sourceGesture, input);
    bundledGesture = bundled.accumulateRailWheel(bundledGesture, input);
    assert.deepEqual(plain(bundledGesture), plain(sourceGesture));
  }

  let sourceStart = 10;
  let bundledStart = 10;
  sourceGesture = undefined;
  bundledGesture = undefined;
  for (const input of [
    { deltaY: 20, timeStamp: 0 },
    { deltaX: 20, deltaY: 10, timeStamp: 10 },
    { deltaY: 16, timeStamp: 20 },
    { deltaY: 100, timeStamp: 200 },
    { deltaY: -100, ctrlKey: true, timeStamp: 220 },
  ]) {
    const source = sourceResolveRailWheel(
      sourceGesture,
      input,
      sourceStart,
      entries.length,
      25,
    );
    const emitted = bundled.resolveRailWheel(
      bundledGesture,
      input,
      bundledStart,
      entries.length,
      25,
    );
    assert.deepEqual(plain(emitted), plain(source));
    sourceGesture = source.gesture;
    bundledGesture = emitted.gesture;
    sourceStart = source.start;
    bundledStart = emitted.start;
  }
});

test("shows two complete graded edge markers and animates stable slots", () => {
  for (const value of [
    ".RhpIHW_railBandSlot{transition:transform .17s cubic-bezier(.22,.75,.18,1);will-change:transform}",
    ".RhpIHW_railPreviewSlot{pointer-events:auto;cursor:pointer;opacity:0;z-index:0;transition:transform .17s cubic-bezier(.22,.75,.18,1),opacity .09s ease-in}",
    ".RhpIHW_track:hover .RhpIHW_railPreviewSlot,.RhpIHW_track:focus-within .RhpIHW_railPreviewSlot{opacity:1",
    ".RhpIHW_railPeekMark{pointer-events:none;background:var(--dsw-alias-label-tertiary);border-radius:2px;position:absolute;top:50%;transform:translateY(-50%);transition:width .16s cubic-bezier(.22,.75,.18,1),opacity .08s ease-out}",
    '.RhpIHW_railPreviewSlot[data-turn-nav-peek-depth=\\"1\\"] .RhpIHW_railPeekMark{width:7px;height:2px;left:13px;opacity:.42}',
    '.RhpIHW_railPreviewSlot[data-turn-nav-peek-depth=\\"2\\"] .RhpIHW_railPeekMark{width:5px;height:2px;left:14px;opacity:.24}',
    '.RhpIHW_track[data-turn-nav-motion=\\"burst\\"] .RhpIHW_railBandSlot{transition-duration:.11s;transition-timing-function:cubic-bezier(.16,.84,.24,1)}',
    '.RhpIHW_track[data-turn-nav-motion=\\"burst\\"] .RhpIHW_railPreviewSlot{transition-property:transform,opacity;transition-duration:.11s,.09s',
    ".RhpIHW_railPreviewSlot{transition-duration:.17s,.13s}.RhpIHW_track:hover .RhpIHW_railPreviewSlot,.RhpIHW_track:focus-within .RhpIHW_railPreviewSlot{transition-duration:.17s,.19s}",
    '.RhpIHW_track[data-turn-nav-motion=\\"burst\\"] .RhpIHW_railPreviewSlot{transition-duration:.11s,.13s}',
    '.RhpIHW_track[data-turn-nav-motion=\\"burst\\"]:hover .RhpIHW_railPreviewSlot,.RhpIHW_track[data-turn-nav-motion=\\"burst\\"]:focus-within .RhpIHW_railPreviewSlot{transition-duration:.11s,.19s}',
    "@media (prefers-reduced-motion:reduce){.RhpIHW_railBandSlot,.RhpIHW_railPeekMark{transition:none}}",
    'edge: "older"',
    'edge: "newer"',
    '"data-turn-nav-peek": edge',
    '"data-turn-nav-peek-depth": depth',
    '"data-turn-nav-peek-item": item.id',
    '"data-turn-nav-peek-slot": relativeIndex',
    "translate3d(0, ${relativeIndex * railGap}px, 0)",
    '"data-turn-nav-motion": railMotionMode',
    "classifyRailMotion(railLastMotionAtRef.current, motionAt)",
  ]) {
    assert.ok(client.includes(value), value);
  }
  assert.doesNotMatch(client, /olderPeek\b|newerPeek\b/u);
  assert.doesNotMatch(client, /railPeekLayer/u);
  assert.doesNotMatch(
    client,
    /data-turn-nav-animate=false[^}]*transition:none/u,
  );
  assert.doesNotMatch(
    client,
    /\.RhpIHW_railPeekMark\[data-turn-nav-peek-depth=/u,
  );
  assert.doesNotMatch(
    client,
    /\[data-turn-nav-peek-depth=[12]\]/u,
    "numeric CSS attribute values must stay quoted so browsers keep the rule",
  );
  assert.ok(client.includes("children: railBandItems.map"));
  assert.match(client, /key: item\.id/u);
  assert.doesNotMatch(client, /\.RhpIHW_railPreviewSlot\{pointer-events:none/u);
  assert.match(
    client,
    /onMouseLeave: \(\) => \{\s+hoveredSlotRef\.current = null;\s+setHoveredId\(null\)/u,
  );
  for (const value of [
    "onMouseEnter: syncRailHoverAtPointer",
    "onMouseMove: syncRailHoverAtPointer",
    'target.closest("[data-turn-nav-peek-item]")',
    'preview.getAttribute("data-turn-nav-peek-item")',
    'const previewSlot = Number(preview.getAttribute("data-turn-nav-peek-slot"))',
    "hoveredSlotRef.current = Number.isInteger(previewSlot) ? previewSlot : null",
    "railSlotAtPointer(event.clientY, bounds.top, railStartOffset, railGap, railItems.length)",
    "setHoveredId((current) => current === nextId ? current : nextId)",
  ]) {
    assert.ok(client.includes(value), value);
  }
  assert.doesNotMatch(
    client,
    /hoveredSlotRef\.current = index/u,
    "moving keyed slots must not overwrite the fixed physical hover slot",
  );
  assert.ok(client.includes(".RhpIHW_marker{height:100%;min-height:0}"));
  assert.ok(client.includes(".RhpIHW_markerSlot{min-height:0}"));
  assert.ok(
    client.lastIndexOf(".RhpIHW_markerSlot{min-height:0}") >
      client.indexOf(".RhpIHW_markerSlot{position:relative;height:"),
  );
});

test("makes graded edge markers previewable, jumpable, and part of the wave", () => {
  const start = client.indexOf("if (edge !== void 0) return");
  const end = client.indexOf("const index = windowIndex", start);
  const previewBranch = client.slice(start, end);
  const previewOuter = previewBranch.slice(
    0,
    previewBranch.indexOf("children: ["),
  );

  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(previewOuter, /aria-hidden/u);
  for (const value of [
    'role: "button"',
    '"aria-label": ariaLabel',
    '"aria-current": current ? "location" : void 0',
    "tabIndex: railTabStopId === item.id ? 0 : -1",
    "onClick: activateItem",
    "onMarkerKeyDown(event, item)",
    "disclosed &&",
    "(Tooltip, {",
  ]) {
    assert.ok(previewBranch.includes(value), value);
  }
  assert.match(client, /const railTabStopId = railBandItems\.some/u);
  for (const value of [
    ".RhpIHW_railBandSlot[data-turn-nav-disclosed=true] :is(.RhpIHW_mark,.RhpIHW_railPeekMark){width:39px!important",
    ".RhpIHW_railBandSlot:has(+ .RhpIHW_railBandSlot[data-turn-nav-disclosed=true]) :is(.RhpIHW_mark,.RhpIHW_railPeekMark)",
    "{width:30px!important;left:12px!important;opacity:.72}",
    "{width:21px!important;left:12px!important;opacity:.58}",
    "{width:15px!important;left:12px!important;opacity:.46}",
  ]) {
    assert.ok(client.includes(value), value);
  }
});

test("keyboard navigation crosses rail windows without losing the tab stop", () => {
  assert.match(
    client,
    /railItemsAll\.findIndex\(\(\{ item \}\) => item\.id === from\)/u,
  );
  assert.ok(client.includes('event.key === "PageUp"'));
  assert.ok(client.includes('event.key === "PageDown"'));
  assert.match(client, /tabIndex: railTabStopId === item\.id \? 0 : -1/u);
  assert.match(
    client,
    /requestAnimationFrame\(\(\) => \{\s+buttonRefs\.current\.get\(next\.id\)\?\.focus\(\)/u,
  );
});

test("keeps current and disclosed marker states visually distinct", () => {
  assert.ok(
    client.includes(
      ".RhpIHW_markerSlot[data-turn-nav-disclosed=true] .RhpIHW_mark{width:39px!important",
    ),
  );
  assert.ok(
    client.includes(
      ".RhpIHW_markerSlot:has(+ .RhpIHW_markerSlot[data-turn-nav-disclosed=true]) .RhpIHW_mark",
    ),
  );
  assert.ok(
    client.includes(
      ".RhpIHW_markerSlot .RhpIHW_mark{width:9px!important;background:var(--dsw-alias-label-tertiary);opacity:.32}",
    ),
  );
  assert.ok(
    client.includes(
      ".RhpIHW_markerSlot .RhpIHW_mark{transition:width .16s cubic-bezier(.22,.75,.18,1),opacity .08s ease-out,transform .12s ease-out}@media (prefers-reduced-motion:reduce){.RhpIHW_markerSlot .RhpIHW_mark{transition:none}}",
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
      ".RhpIHW_tooltip{left:calc(100% + 24px)}.RhpIHW_markerSlot::after,.RhpIHW_railPreviewSlot::after{width:24px}",
    ),
  );
  assert.ok(
    client.includes(
      ":is(.RhpIHW_markerSlot,.RhpIHW_railPreviewSlot)::after{pointer-events:none}:is(.RhpIHW_markerSlot,.RhpIHW_railPreviewSlot)[data-turn-nav-disclosed=true]::after,:is(.RhpIHW_markerSlot,.RhpIHW_railPreviewSlot):focus-within::after{pointer-events:auto}",
    ),
  );
});

test("keeps timeline previews above sticky transcript surfaces", () => {
  assert.ok(
    client.includes(".B_rMOG_navigationSeat{width:100%;margin:0;z-index:20}"),
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
