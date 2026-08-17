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
if (manifest.dsh?.bundle?.patch !== "./cordis.patch.yml") {
  fail("missing dsh.bundle.patch");
}
if (
  !patch.includes("id: ui-conversation") ||
  !patch.includes("disabled: true") ||
  !patch.includes("id: codex-timeline") ||
  !patch.includes("name: dsh-codex-timeline")
) {
  fail("bundle does not disable and replace the conversation row");
}
if (
  !client.startsWith(
    'window.__ModuleLoader__.load({\n\tid: "dsh-codex-timeline"',
  )
) {
  fail("client module id does not match the package name");
}
for (const required of [
  '"conversation.chat.navigation"',
  "buildTurnNavigationIndex",
  "IntersectionObserver",
  "ResizeObserver",
  "requestAnimationFrame",
  "timeline.search.open",
  "timeline.position",
  "timeline.ttft",
  "tokensPerSecond",
  "prefers-reduced-motion",
  "items.length < 3 && !hasMore",
  "settings.leftOffset",
  "--turn-nav-spacing",
  "--turn-nav-center",
  "/codex-timeline/settings",
]) {
  if (!client.includes(required)) fail(`client is missing ${required}`);
}
for (const forbidden of [
  "MutationObserver",
  "monkey patch",
  "E:\\Program",
  "C:\\Users",
]) {
  if (client.includes(forbidden))
    fail(`client contains forbidden text ${forbidden}`);
}
if (!host.includes('CONVERSATION_SETTINGS_NAMESPACE = "ui-conversation"')) {
  fail("host conversation settings schema is missing");
}
if (!host.includes('TIMELINE_SETTINGS_NAMESPACE = "dsh-codex-timeline"')) {
  fail("host timeline settings namespace is missing");
}
if (!host.includes('path: "/codex-timeline"')) {
  fail("host timeline settings route is missing");
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
const expected = compatibility.adapter?.artifactSha256;
if (expected === "PENDING") {
  console.warn(`artifact SHA-256 is not pinned yet: ${digest}`);
} else if (digest !== expected) {
  fail(`client SHA-256 mismatch: expected ${expected}, received ${digest}`);
}

console.log(
  `verified dsh-codex-timeline ${manifest.version} (${digest.slice(0, 12)})`,
);
