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
  "located.length === 0 && !hasMore",
  "settings.leftOffset",
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
  "allItems.find((candidate) => candidate.id === pendingJumpId)",
  "timeline.search.hint",
  // full-session index feed + rail (0.4.0)
  "function fetchRemoteIndex",
  "const [remoteIndex, setRemoteIndex]",
  '"timeline.earlierCount"',
  "unloaded: false",
  "const railGap",
  "const railStartOffset",
  "preferences.recentTurns ?? 25",
  "settings.recentTurns",
  "timeLabelSameDay",
  "remoteIndexCache",
  "const allItems = indexItems",
  "jumpMeasureTick",
  "jumpStage",
  '"timeline.jump.paging"',
  ".dsh-tl-jumpStatus",
  'kind === "user" || kind === "steering"',
  "jumpPagesRef",
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
]) {
  if (client.includes(dropped))
    fail(`client still contains removed panel marker ${dropped}`);
}
if (
  client.includes("overflow-y:auto;justify-content:flex-start") ||
  client.includes(".RhpIHW_track{overflow-y:auto")
) {
  fail("track scroll override clips the hover tooltip");
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
  !host.includes('["sessionPersistence"]') ||
  !host.includes(".readRaw(") ||
  !host.includes("raw.content")
) {
  fail("host full-session search route is missing");
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
