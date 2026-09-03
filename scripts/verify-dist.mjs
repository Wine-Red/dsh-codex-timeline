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

const [manifestSource, compatibilitySource, patch, client, host, invariant] =
  await Promise.all([
    read("package.json"),
    read("compatibility.json"),
    read("cordis.patch.yml"),
    read("lib/client.js"),
    read("lib/index.js"),
    read("lib/invariant.js"),
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
if (manifest.version !== "0.6.0") fail("unexpected release version");
if (manifest.dsh?.bundle?.patch !== "./cordis.patch.yml") {
  fail("missing dsh.bundle.patch");
}
if (
  patch.includes("id: ui-conversation") ||
  patch.includes("disabled: true") ||
  !patch.includes("id: codex-timeline") ||
  !patch.includes("name: dsh-codex-timeline")
) {
  fail("bundle must enhance without replacing Conversation");
}
if (
  compatibility.dsh?.version !== "0.1.2-alpha.3" ||
  compatibility.adapter?.mode !== "official-navigation-enhancer" ||
  compatibility.adapter?.officialNavigation !== "TurnNavigator" ||
  manifest.dshCodexTimeline?.compatibilityMode !==
    "official-navigation-enhancer"
) {
  fail("alpha.3 official-navigation compatibility metadata is stale");
}
if (
  !client.startsWith(
    'window.__ModuleLoader__.load({\n\tid: "dsh-codex-timeline"',
  )
) {
  fail("client module id does not match the package name");
}

for (const required of [
  '"settings.plugin.item"',
  '"conversation.session.header.actions"',
  'document.querySelectorAll("[data-chat-flow]")',
  '`[data-chat-turn="${String(turn)}"]`',
  "function officialNavigator",
  "function enhanceOfficialNavigator",
  "function restoreOfficialNavigator",
  "ctx.sessions.binding(sessionId)?.session.loadThrough(seq)",
  "ctx.sessions.fork({ sessionId, atSeq: seq, increaseTitle: true })",
  'const SETTINGS_URL = "/codex-timeline/settings"',
  'const SEARCH_URL = "/codex-timeline/search"',
  "item.branchSeq",
  'role: "dialog"',
  'role: "status"',
  '"aria-live": "polite"',
  '"aria-expanded": open',
  '"aria-pressed": favorite',
  'type: "search"',
  "prefers-reduced-motion",
  "settings.enabled",
  "settings.showOnRight",
  "settings.leftOffset",
  "settings.centerOffset",
  "settings.markerSpacing",
  "settings.recentTurns",
  "function safeSlot",
  "disabled after startup failure",
]) {
  if (!client.includes(required)) fail(`client is missing ${required}`);
}

for (const forbidden of [
  "AdditiveTurnNavigation",
  "MountedAdditiveTurnNavigation",
  "LegacyImageGallery",
  "createPortal",
  "snapshot.chat",
  '"conversation.chat.navigation"',
  '"conversation.message.images"',
  "@deepseek-ai/dsh-client-ui-chat",
  "@deepseek-ai/dsh-client-ui-conversation",
  "@deepseek-ai/dsh-client-runtime",
  "data-chat-anchor-key",
  "RhpIHW_rail",
  "landingFlash",
  "dsh-nav-enhancer-landed",
  "flashTurnRow",
  "E:\\Program",
  "C:\\Users",
]) {
  if (client.includes(forbidden)) {
    fail(
      `client still contains duplicate or private implementation ${forbidden}`,
    );
  }
}

const runtimeImports = [...client.matchAll(/require\("([^"]+)"\)/gu)].map(
  (match) => match[1],
);
if (
  JSON.stringify(runtimeImports) !==
  JSON.stringify(["react", "react/jsx-runtime"])
) {
  fail(`unexpected browser runtime imports: ${runtimeImports.join(", ")}`);
}

for (const required of [
  'TIMELINE_SETTINGS_NAMESPACE = "dsh-codex-timeline"',
  "enabled: z.boolean().default(true)",
  'side: z.union([z.const("left"), z.const("right")]).default("left")',
  "leftOffset: z.number().step(1).min(0).max(120).default(0)",
  "centerOffset: z.number().step(1).min(-200).max(200).default(0)",
  "markerSpacing: z.number().step(1).min(6).max(40).default(10)",
  "recentTurns: z.number().step(1).min(5).max(50).default(25)",
  '"/codex-timeline/settings"',
  '"/codex-timeline/search"',
  "function buildTurnSearchIndex",
  "function buildTurnIndex",
  "entry.branchSeq = entry.lastSurfaceSeq",
  "branchUnavailable: entry.branchUnavailable",
  "function safeHostInject",
  "function safeHostEffect",
  'mutate(ns, [{ op: "unset", path: ["landingFlash"] }])',
]) {
  if (!host.includes(required)) fail(`host is missing ${required}`);
}
if (host.includes('CONVERSATION_SETTINGS_NAMESPACE = "ui-conversation"')) {
  fail("host must not register Conversation settings");
}
if (host.includes("TURN_NAVIGATION_SETTINGS_NAMESPACE")) {
  fail("host must not register official TurnNavigator settings");
}
if (!invariant.includes('PACKAGE_NAME = "dsh-codex-timeline"')) {
  fail("invariant ownership is stale");
}

const digest = createHash("sha256").update(client).digest("hex");
console.log(
  `verified dsh-codex-timeline ${manifest.version} for DSH ${compatibility.dsh.version} (${digest.slice(0, 12)})`,
);
