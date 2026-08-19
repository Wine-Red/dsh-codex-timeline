import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const compatibility = JSON.parse(
  await readFile(new URL("../compatibility.json", import.meta.url), "utf8"),
);
const patch = await readFile(
  new URL("../cordis.patch.yml", import.meta.url),
  "utf8",
);
const installer = await readFile(
  new URL("../install.ps1", import.meta.url),
  "utf8",
);
const client = await readFile(
  new URL("../lib/client.js", import.meta.url),
  "utf8",
);

test("ships as an additive public DSH bundle", () => {
  assert.equal(manifest.name, "dsh-codex-timeline");
  assert.notEqual(manifest.private, true);
  assert.equal(manifest.dsh.bundle.patch, "./cordis.patch.yml");
  assert.equal(manifest.dsh.profile, undefined);
  assert.doesNotMatch(
    patch,
    /- id: ui-conversation/u,
    "the timeline must never replace or disable the official Conversation",
  );
  assert.match(
    patch,
    /- insert:\s+- id: codex-timeline\s+name: dsh-codex-timeline/u,
  );
});

test("declares the narrow verified rc.7-rc.8 compatibility window", () => {
  assert.equal(compatibility.dsh.version, "0.1.0-rc.8");
  assert.deepEqual(compatibility.dsh.verifiedVersions, [
    "0.1.0-rc.7",
    "0.1.0-rc.8",
  ]);
  assert.equal(
    compatibility.dsh.rc7Commit,
    "99f6f02fecdb7dff40c3fbc9470f5907c29f74ca",
  );
  assert.equal(
    compatibility.officialConversation.package,
    "@deepseek-ai/dsh-client-ui-conversation",
  );
  assert.equal(compatibility.officialConversation.ownership, "preserved");
  assert.equal(compatibility.adapter.mode, "additive-public-lifecycle");
  assert.equal(
    compatibility.adapter.publicSlot,
    "conversation.session.header.actions",
  );
  for (const [name, version] of Object.entries(manifest.peerDependencies)) {
    if (name.startsWith("@deepseek-ai/dsh-"))
      assert.equal(version, ">=0.1.0-rc.7 <0.1.0-rc.9", name);
  }
  assert.equal(
    manifest.dependencies["@deepseek-ai/dsh-settings"],
    "0.1.0-rc.7",
    "the bundled Host settings ABI stays on the backward-compatible baseline",
  );
});

test("installer accepts only the two verified DSH versions", () => {
  assert.match(
    installer,
    /\$supportedVersions\s*=\s*@\(['"]0\.1\.0-rc\.7['"], ['"]0\.1\.0-rc\.8['"]\)/u,
  );
  assert.match(installer, /\$actualVersion -notin \$supportedVersions/u);
});

test("keeps the original 0.3.2 style corpus byte-for-byte", () => {
  const pattern = /\bconst css(?:\$\d+)? = ("(?:\\.|[^"\\])*");/gu;
  const styles = [...client.matchAll(pattern)].map((match) =>
    JSON.parse(match[1]),
  );
  assert.equal(styles.length, 23);
  assert.equal(
    createHash("sha256").update(styles.join("\n")).digest("hex"),
    compatibility.adapter.styleCorpusSha256,
  );
});

test("bridges rc.8 message images without removing the rc.7 component path", () => {
  assert.match(client, /LegacyImageGallery/u);
  assert.match(client, /renderSlot\("conversation\.message\.images"/u);
  assert.equal(
    compatibility.adapter.rc8MessageImagesSlot,
    "conversation.message.images",
  );
});

test("mounts additively and keeps failures inside the timeline", () => {
  assert.match(client, /disabled after startup failure/u);
  assert.match(client, /function safeSlotInject/u);
  assert.match(client, /function AdditiveTurnNavigation/u);
  assert.match(client, /"conversation\.session\.header\.actions"/u);
  assert.match(client, /document\.querySelector\("\[data-chat-flow\]"\)/u);
  assert.match(client, /querySelectorAll\("\[data-chat-anchor-key\]"\)/u);
  assert.match(client, /react_dom\.createPortal/u);
  assert.doesNotMatch(
    client,
    /function apply\(ctx\) \{\s*apply\$2\(ctx\)/u,
    "the client entrypoint must not mount the vendored Conversation",
  );
});

test("npm payload excludes local installers, source maps, and tarballs", () => {
  assert.ok(!manifest.files.some((entry) => entry.endsWith(".map")));
  assert.ok(!manifest.files.some((entry) => entry.endsWith(".tgz")));
  assert.ok(!manifest.files.some((entry) => entry.endsWith(".ps1")));
});
