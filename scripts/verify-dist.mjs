import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Script } from "node:vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFile(path.join(root, relative), "utf8");
const fail = (message) => {
  throw new Error(`distribution contract failed: ${message}`);
};

const [
  manifestSource,
  compatibilitySource,
  patch,
  client,
  host,
  invariant,
  clientTypes,
  hostTypes,
] = await Promise.all([
  read("package.json"),
  read("compatibility.json"),
  read("cordis.patch.yml"),
  read("lib/client.js"),
  read("lib/index.js"),
  read("lib/invariant.js"),
  read("lib/types/client/index.d.ts"),
  read("lib/types/index.d.ts"),
]);
const manifest = JSON.parse(manifestSource);
const compatibility = JSON.parse(compatibilitySource);

try {
  new Script(client, { filename: "lib/client.js" });
} catch (error) {
  fail(
    `client bundle is not valid JavaScript: ${error instanceof Error ? error.message : String(error)}`,
  );
}

if (manifest.name !== "dsh-codex-timeline") fail("unexpected package name");
if (manifest.private === true) fail("package is private");
if (manifest.dsh?.bundle?.patch !== "./cordis.patch.yml") {
  fail("missing dsh.bundle.patch");
}
if (
  patch.includes("id: ui-conversation") ||
  patch.includes("disabled: true") ||
  !patch.includes("id: codex-timeline") ||
  !patch.includes("name: dsh-codex-timeline")
) {
  fail("bundle must add the timeline without replacing Conversation");
}
if (
  !client.startsWith(
    'window.__ModuleLoader__.load({\n\tid: "dsh-codex-timeline"',
  )
) {
  fail("client module id does not match the package name");
}
for (const required of [
  '"conversation.session.header.actions"',
  '"conversation.message.images"',
  "LegacyImageGallery",
  "buildTurnNavigationIndex",
  "IntersectionObserver",
  "ResizeObserver",
  "requestAnimationFrame",
  "timeline.search.open",
  "timeline.position",
  "timeline.ttft",
  "tokensPerSecond",
  "prefers-reduced-motion",
  "shouldRenderRailSurface",
  "trackedKeys.current.size === 0 && !keepViewportRef.current",
  "settings.leftOffset",
  "settings.showOnRight",
  'const railSide = preferences.side === "right" ? "right" : "left"',
  '"data-turn-nav-side": railSide',
  'setPreference("side", value ? "right" : "left")',
  'side: clean.side === "right" ? "right" : "left"',
  "next.side === this.snapshot.side",
  "--turn-nav-right-safe-inset",
  'data-turn-nav-side=\\"right\\"] .RhpIHW_tooltip{left:auto;right:calc(100% + 24px)',
  'data-turn-nav-side=\\"right\\"] .RhpIHW_searchPanel{left:auto;right:42px}',
  ":is(.RhpIHW_markerSlot,.RhpIHW_railPreviewSlot)::after{pointer-events:none}",
  ":is(.RhpIHW_markerSlot,.RhpIHW_railPreviewSlot)[data-turn-nav-disclosed=true]::after",
  "[data-details-collapsed]",
  "--turn-nav-spacing",
  "--turn-nav-center",
  "/codex-timeline/settings",
  "function AdditiveTurnNavigation",
  'document.querySelector("[data-chat-flow]")',
  'querySelectorAll("[data-chat-anchor-key]")',
  "react_dom.createPortal",
  "disabled after startup failure",
  "function safeSlotInject",
  // full-session search bridge (0.4.0)
  '"/codex-timeline/search"',
  "function fetchRemoteSearch",
  "function remoteItemFromHit",
  "const [remoteSearch, setRemoteSearch]",
  '"timeline.search.countRemote"',
  "allItems.find((candidate) => candidate.id === jumpRequest.id)",
  "timeline.search.hint",
  // full-session index feed + rail (0.4.0)
  "function fetchRemoteIndex",
  "const [remoteIndex, setRemoteIndex]",
  "unloaded: false",
  "const railGap",
  "const railStartOffset",
  "const railTrackTop = 52",
  "preferences.recentTurns ?? 25",
  "function deriveRailWindow",
  "function deriveRailBand",
  "function deriveRailGeometry",
  "function classifyRailMotion",
  "function stepRailWindow",
  "function railWindowStartForIndex",
  "function accumulateRailWheel",
  "function resolveRailWheel",
  "resolution.shouldPreventDefault",
  "const [railWindowAnchorId, setRailWindowAnchorId]",
  'track.addEventListener("wheel", onRailWheel, { passive: false })',
  'edge: "older"',
  'edge: "newer"',
  '"data-turn-nav-peek": edge',
  '"data-turn-nav-peek-depth": depth',
  '"data-turn-nav-peek-item": item.id',
  '"data-turn-nav-peek-slot": relativeIndex',
  'target.closest("[data-turn-nav-peek-item]")',
  'preview.getAttribute("data-turn-nav-peek-item")',
  'preview.getAttribute("data-turn-nav-peek-slot")',
  "children: railBandItems.map",
  "translate3d(0, ${relativeIndex * railGap}px, 0)",
  '"data-turn-nav-motion": railMotionMode',
  "classifyRailMotion(railLastMotionAtRef.current, motionAt)",
  "railTabStopId === item.id",
  "const railTabStopId = railBandItems.some",
  ".RhpIHW_railBandSlot[data-turn-nav-disclosed=true] :is(.RhpIHW_mark,.RhpIHW_railPeekMark){width:39px!important",
  "settings.recentTurns",
  "timeLabelSameDay",
  "remoteIndexCache",
  "const allItems = indexItems",
  "jumpMeasureTick",
  "jumpSequenceRef",
  "cancelScroll: (0, react.useCallback)",
  "manualScrollVersion() !== jumpRequest.manualScrollVersion",
  "resolveJumpBehavior",
  "resolveJumpSettle",
  "advanceJumpPagingProgress",
  "anchorCount: materializedAnchorCount()",
  "pagingRestoreRef",
  "registeredAnchorsRef",
  "syncNavigationAnchors",
  "transition:width .16s cubic-bezier(.22,.75,.18,1)",
  "capturePagingAnchor",
  "loadOlder: loadOlderAnchored",
  ".B_rMOG_navigationSeat{width:100%;margin:0;z-index:20}",
  "data-dsh-codex-timeline-landed",
  '"data-turn-nav-jump": markerJumpState ?? void 0',
  '"aria-live": "polite"',
  "const jumpNoticeTimerRef = (0, react.useRef)(null)",
  'className: "RhpIHW_jumpNotice"',
  '"timeline.jump.loadingProgress"',
  "jumpRequest.pages >= 400",
  "progress.stalls >= 5",
  'kind === "user" || kind === "steering"',
]) {
  if (!client.includes(required)) fail(`client is missing ${required}`);
}
for (const dropped of [
  "const [indexOpen, setIndexOpen]",
  '"timeline.index.open"',
  ".dsh-tl-indexBadge",
  '"timeline.index.heading"',
  ".dsh-tl-unloadedMark",
  "dsh-tl-unloadedSlot",
  // removed diagnostic jump-status chip (0.5.0 cut)
  '"timeline.jump.paging"',
  ".dsh-tl-jumpStatus",
  "const [jumpStage, setJumpStage]",
  "function jumpStatusText",
  "const [pendingJumpId",
  "setPendingJumpId",
  "jumpPagesRef",
  "const unloadedCount",
  "const earlierLabel",
  '"timeline.earlierCount"',
]) {
  if (client.includes(dropped))
    fail(`client still contains removed panel marker ${dropped}`);
}
const desktopRailStart = client.indexOf("railVisible &&");
const desktopRailEnd = client.indexOf("drawerOpen &&", desktopRailStart);
if (desktopRailStart < 0 || desktopRailEnd <= desktopRailStart) {
  fail("client desktop rail branch could not be located");
}
if (
  client
    .slice(desktopRailStart, desktopRailEnd)
    .includes("TurnNavigation_module_css_default.earlier")
) {
  fail("client still renders the redundant desktop load-earlier control");
}
if (
  client.includes("overflow-y:auto;justify-content:flex-start") ||
  client.includes(".RhpIHW_track{overflow-y:auto") ||
  client.includes("railPeekLayer") ||
  /\bolderPeek\b|\bnewerPeek\b/u.test(client)
) {
  fail("rail must use complete edge previews without clipping the tooltip");
}
for (const forbidden of [
  "MutationObserver",
  "monkey patch",
  "items.length < 3 && !hasMore",
  "E:\\Program",
  "C:\\Users",
]) {
  if (client.includes(forbidden))
    fail(`client contains forbidden text ${forbidden}`);
}
if (host.includes('CONVERSATION_SETTINGS_NAMESPACE = "ui-conversation"')) {
  fail("host must not register or replace Conversation settings");
}
if (`${clientTypes}\n${hostTypes}`.includes("rc.6 conversation")) {
  fail("type declarations still describe the removed Conversation replacement");
}
if (!host.includes('TIMELINE_SETTINGS_NAMESPACE = "dsh-codex-timeline"')) {
  fail("host timeline settings namespace is missing");
}
if (
  !host.includes(
    'side: z.union([z.const("left"), z.const("right")]).default("left")',
  )
) {
  fail("host timeline side setting is missing or no longer defaults to left");
}
if (!host.includes('path: "/codex-timeline"')) {
  fail("host timeline settings route is missing");
}
if (
  !host.includes('"/codex-timeline/search"') ||
  !host.includes("function searchRouteHandler") ||
  !host.includes("function buildTurnSearchIndex") ||
  !host.includes("function buildTurnIndex") ||
  !host.includes('url.searchParams.get("lite") === "1"') ||
  !host.includes('["sessionQuery"]') ||
  !host.includes(".readSession(") ||
  !host.includes('["sessions"]') ||
  !host.includes("function cachedLiteIndex") ||
  !host.includes("live.events") ||
  !host.includes("jsonOk(res, { items, total })") ||
  !host.includes('["sessionPersistence"]') ||
  !host.includes(".readRaw(") ||
  !host.includes("raw.content")
) {
  fail("host full-session search route is missing");
}
if (host.includes("SEARCH_INDEX_MAX")) {
  fail("lite full-session index must not truncate long timelines");
}
if (
  !host.includes("function safeHostInject") ||
  !host.includes("function safeHostEffect")
) {
  fail("host startup isolation is missing");
}
if (host.includes("TURN_NAVIGATION_SETTINGS_NAMESPACE")) {
  fail("host must not register a ui-turn-navigation settings namespace");
}
if (
  !client.includes('"settings.plugin.item"') ||
  !client.includes('key: "dsh-codex-timeline"')
) {
  fail("client plugin-config settings card is missing");
}
if (!invariant.includes('PACKAGE_NAME = "dsh-codex-timeline"')) {
  fail("invariant ownership is stale");
}

const digest = createHash("sha256").update(client).digest("hex");
const cssPattern = /\bconst css(?:\$\d+)? = ("(?:\\.|[^"\\])*");/gu;
const cssLiterals = [...client.matchAll(cssPattern)].map((match) =>
  JSON.parse(match[1]),
);
if (cssLiterals.length !== 23) {
  fail(
    `expected 23 original 0.3.2 style blocks, received ${cssLiterals.length}`,
  );
}
const styleDigest = createHash("sha256")
  .update(cssLiterals.join("\n"))
  .digest("hex");
if (styleDigest !== compatibility.adapter?.styleCorpusSha256) {
  fail(
    `0.3.2 style corpus changed: expected ${compatibility.adapter?.styleCorpusSha256}, received ${styleDigest}`,
  );
}
const expected = compatibility.adapter?.artifactSha256;
if (expected === "PENDING") {
  console.warn(`artifact SHA-256 is not pinned yet: ${digest}`);
} else if (digest !== expected) {
  fail(`client SHA-256 mismatch: expected ${expected}, received ${digest}`);
}

console.log(
  `verified dsh-codex-timeline ${manifest.version} (${digest.slice(0, 12)})`,
);
