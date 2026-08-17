import assert from "node:assert/strict";
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

test("ships as a public DSH bundle, not a profile or plain dependency", () => {
  assert.equal(manifest.name, "dsh-codex-timeline");
  assert.notEqual(manifest.private, true);
  assert.equal(manifest.dsh.bundle.patch, "./cordis.patch.yml");
  assert.equal(manifest.dsh.profile, undefined);
  assert.match(
    patch,
    /- id: ui-conversation\s+name: ["']@deepseek-ai\/dsh-client-ui-conversation["']\s+disabled: true/u,
  );
  assert.match(
    patch,
    /- insert:\s+- id: codex-timeline\s+name: dsh-codex-timeline/u,
  );
});

test("pins every DSH runtime compatibility edge to rc.7", () => {
  assert.equal(compatibility.dsh.version, "0.1.0-rc.7");
  assert.equal(
    compatibility.dsh.commit,
    "99f6f02fecdb7dff40c3fbc9470f5907c29f74ca",
  );
  assert.equal(
    compatibility.upstream.package,
    "@deepseek-ai/dsh-client-ui-conversation",
  );
  for (const [name, version] of Object.entries(manifest.peerDependencies)) {
    if (name.startsWith("@deepseek-ai/dsh-"))
      assert.equal(version, "0.1.0-rc.7", name);
  }
});

test("npm payload excludes local installers, source maps, and tarballs", () => {
  assert.ok(!manifest.files.some((entry) => entry.endsWith(".map")));
  assert.ok(!manifest.files.some((entry) => entry.endsWith(".tgz")));
  assert.ok(!manifest.files.some((entry) => entry.endsWith(".ps1")));
});
