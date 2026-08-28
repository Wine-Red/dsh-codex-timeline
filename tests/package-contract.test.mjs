import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { apply } from "../lib/index.js";

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
const host = await readFile(
  new URL("../lib/index.js", import.meta.url),
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

test("declares the verified 0.1.1-rc.2 compatibility window", () => {
  assert.equal(compatibility.dsh.version, "0.1.1-rc.2");
  assert.deepEqual(compatibility.dsh.verifiedVersions, ["0.1.1-rc.2"]);
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
      assert.equal(version, "^0.1.1-rc.2", name);
  }
  assert.equal(
    manifest.dependencies["@deepseek-ai/dsh-settings"],
    "0.1.1-rc.2",
    "the bundled Host settings ABI matches the verified runtime",
  );
});

test("accepts the verified ReactDOM 18 runtime and compatible ReactDOM 19 hosts", () => {
  assert.equal(manifest.peerDependencies["react-dom"], "^18.3.1 || ^19.0.0");
});

test("installer accepts only the verified DSH version", () => {
  assert.match(
    installer,
    /\$supportedVersions\s*=\s*@\(['"]0\.1\.1-rc\.2['"]\)/u,
  );
  assert.match(installer, /\$actualVersion -notin \$supportedVersions/u);
});

test("defaults landing flash on, placement left, and validates persisted settings", () => {
  let timelineSchema;
  const errors = [];
  apply({
    logger: { error: (message) => errors.push(message) },
    inject: (services, install) => {
      if (services.length !== 1 || services[0] !== "settings") return;
      install({
        settings: {
          register: (_namespace, schema) => {
            timelineSchema = schema;
          },
          describe: () => [],
          update: async () => undefined,
        },
      });
    },
    effect: (install) => install(),
    webServer: { register: () => () => undefined },
  });

  assert.equal(typeof timelineSchema, "function");
  assert.equal(timelineSchema({}).landingFlash, true);
  assert.equal(timelineSchema({ landingFlash: false }).landingFlash, false);
  assert.equal(timelineSchema({}).side, "left");
  assert.equal(timelineSchema({ side: "left" }).side, "left");
  assert.equal(timelineSchema({ side: "right" }).side, "right");
  assert.throws(() => timelineSchema({ side: "top" }), TypeError);
  assert.deepEqual(errors, []);
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

test("bridges message images without replacing the component path", () => {
  assert.match(client, /LegacyImageGallery/u);
  assert.match(client, /renderSlot\("conversation\.message\.images"/u);
  assert.equal(
    compatibility.adapter.messageImagesSlot,
    "conversation.message.images",
  );
});

test("returns the complete lightweight index for long scrollable rails", async () => {
  assert.doesNotMatch(host, /SEARCH_INDEX_MAX/u);

  const events = [];
  let seq = 0;
  for (let turn = 1; turn <= 750; turn += 1) {
    events.push({ seq: seq++, type: "turn/start", data: { turn } });
    events.push({
      seq: seq++,
      time: turn,
      type: "user/message",
      surfaceOp: "append",
      data: {
        source: { kind: "user" },
        content: [{ type: "text", text: `Prompt ${turn}` }],
      },
    });
    events.push({
      seq: seq++,
      type: "turn/end",
      data: { turn, reason: { kind: "completed" } },
    });
  }

  let handler;
  const errors = [];
  const sessions = {
    get: (sessionId) =>
      sessionId === "long-lite-contract" ? { events } : undefined,
  };
  apply({
    logger: { error: (message) => errors.push(message) },
    inject: (services, install) => {
      if (services.includes("sessions")) install({ sessions });
    },
    effect: (install) => install(),
    webServer: {
      register: (registration) => {
        handler = registration.handler;
        return () => undefined;
      },
    },
  });
  assert.equal(typeof handler, "function");

  let status;
  let responseText = "";
  await handler(
    {
      method: "GET",
      url: "/codex-timeline/search?sessionId=long-lite-contract&lite=1",
    },
    {
      writeHead: (value) => {
        status = value;
      },
      end: (value) => {
        responseText = value;
      },
    },
  );

  const response = JSON.parse(responseText);
  assert.equal(status, 200);
  assert.equal(response.ok, true);
  assert.equal(response.items.length, 750);
  assert.equal(response.items[0].turn, 1);
  assert.equal(response.items.at(-1).turn, 750);
  assert.equal(response.total, 750);
  assert.deepEqual(errors, []);
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
