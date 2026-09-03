import assert from "node:assert/strict";
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
  assert.doesNotMatch(patch, /- id: ui-conversation/u);
  assert.match(
    patch,
    /- insert:\s+- id: codex-timeline\s+name: dsh-codex-timeline/u,
  );
});

test("declares the verified alpha3 official-navigation contract", () => {
  assert.equal(compatibility.dsh.version, "0.1.2-alpha.3");
  assert.deepEqual(compatibility.dsh.verifiedVersions, ["0.1.2-alpha.3"]);
  assert.equal(compatibility.officialConversation.ownership, "preserved");
  assert.equal(compatibility.adapter.mode, "official-navigation-enhancer");
  assert.equal(
    compatibility.adapter.publicSlot,
    "conversation.session.header.actions",
  );
  for (const [name, version] of Object.entries(manifest.peerDependencies)) {
    if (name.startsWith("@deepseek-ai/dsh-")) {
      assert.equal(version, "^0.1.2-alpha.3", name);
    }
  }
});

test("does not resolve removed or duplicated browser runtimes", () => {
  assert.doesNotMatch(host, /settingsNamespace/u);
  assert.doesNotMatch(client, /dsh-client-runtime/u);
  assert.doesNotMatch(client, /dsh-client-ui-chat/u);
  assert.doesNotMatch(client, /dsh-client-ui-conversation/u);
  assert.deepEqual(
    [...client.matchAll(/require\("([^"]+)"\)/gu)].map((match) => match[1]),
    ["react", "react/jsx-runtime"],
  );
});

test("installer accepts only the verified DSH version", () => {
  assert.match(
    installer,
    /\$supportedVersions\s*=\s*@\(['"]0\.1\.2-alpha\.3['"]\)/u,
  );
  assert.match(installer, /\$actualVersion -notin \$supportedVersions/u);
});

test("preserves and validates the complete preference namespace", () => {
  let schema;
  const errors = [];
  const mutations = [];
  apply({
    logger: { error: (message) => errors.push(message) },
    inject: (services, install) => {
      if (services.length !== 1 || services[0] !== "settings") return;
      install({
        settings: {
          register: (_namespace, value) => {
            schema = value;
          },
          describe: () => [
            {
              ns: "dsh-codex-timeline",
              value: { enabled: true, landingFlash: true },
              user: { landingFlash: true },
              revision: 1,
            },
          ],
          update: async () => undefined,
          mutate: async (namespace, operations) => {
            mutations.push({ namespace, operations });
          },
        },
      });
    },
    effect: (install) => install(),
    webServer: { register: () => () => undefined },
  });

  const defaults = schema({});
  assert.deepEqual(defaults.favorites, []);
  assert.equal(defaults.enabled, true);
  assert.equal("landingFlash" in defaults, false);
  assert.equal(defaults.side, "left");
  assert.equal(defaults.leftOffset, 0);
  assert.equal(defaults.centerOffset, 0);
  assert.equal(defaults.markerSpacing, 10);
  assert.equal(defaults.recentTurns, 25);
  assert.throws(() => schema({ side: "top" }), TypeError);
  assert.throws(() => schema({ markerSpacing: 41 }), TypeError);
  assert.throws(() => schema({ recentTurns: 4 }), TypeError);
  assert.deepEqual(mutations, [
    {
      namespace: "dsh-codex-timeline",
      operations: [{ op: "unset", path: ["landingFlash"] }],
    },
  ]);
  assert.deepEqual(errors, []);
});

test("returns every turn with jump and completed-turn branch anchors", async () => {
  const events = [];
  let seq = 0;
  for (let turn = 1; turn <= 300; turn += 1) {
    events.push({ seq: seq++, type: "turn/start", data: { turn } });
    const userSeq = seq++;
    events.push({
      seq: userSeq,
      time: turn,
      type: "user/message",
      surfaceOp: "append",
      data: {
        source: { kind: "user" },
        content: [{ type: "text", text: `Prompt ${turn}` }],
      },
    });
    const answerSeq = seq++;
    events.push({
      seq: answerSeq,
      type: "assistant/message",
      surfaceOp: "append",
      data: { message: { content: [{ type: "text", text: "Answer" }] } },
    });
    events.push({
      seq: seq++,
      type: "turn/end",
      data: { turn, reason: { kind: "completed" } },
    });
  }

  let handler;
  apply({
    logger: { error: assert.fail },
    inject: (services, install) => {
      if (services.includes("sessions")) {
        install({
          sessions: {
            get: (sessionId) =>
              sessionId === "contract"
                ? { snapshotEvents: () => events }
                : undefined,
          },
        });
      }
    },
    effect: (install) => install(),
    webServer: {
      register: (registration) => {
        handler = registration.handler;
        return () => undefined;
      },
    },
  });

  let status;
  let body = "";
  await handler(
    {
      method: "GET",
      url: "/codex-timeline/search?sessionId=contract&lite=1",
    },
    {
      writeHead: (value) => {
        status = value;
      },
      end: (value) => {
        body = value;
      },
    },
  );

  const response = JSON.parse(body);
  assert.equal(status, 200);
  assert.equal(response.items.length, 300);
  assert.equal(response.items[0].seq, 1);
  assert.equal(response.items[0].branchSeq, 2);
  assert.equal(response.items[0].branchUnavailable, false);
  assert.equal(response.items.at(-1).turn, 300);
  assert.equal(response.total, 300);
});

test("keeps host search and preference routes isolated", () => {
  for (const marker of [
    '"/codex-timeline/settings"',
    '"/codex-timeline/search"',
    "function searchRouteHandler",
    "function buildTurnSearchIndex",
    "function buildTurnIndex",
    "function liveSessionEvents",
    "snapshotEvents",
    "function searchIsTokenDelta",
    "tokensPerSecond",
    "inputTokens",
    "outputTokens",
    "function safeHostInject",
    "function safeHostEffect",
  ]) {
    assert.ok(host.includes(marker), marker);
  }
  assert.doesNotMatch(host, /TURN_NAVIGATION_SETTINGS_NAMESPACE/u);
});

test("npm payload excludes local installers, source maps, and tarballs", () => {
  assert.ok(!manifest.files.some((entry) => entry.endsWith(".map")));
  assert.ok(!manifest.files.some((entry) => entry.endsWith(".tgz")));
  assert.ok(!manifest.files.some((entry) => entry.endsWith(".ps1")));
});
