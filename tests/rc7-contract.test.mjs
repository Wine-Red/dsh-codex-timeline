import assert from "node:assert/strict";
import test from "node:test";
import { apply } from "../lib/index.js";
import { buildTurnIndex } from "../src/navigation-model.mjs";

function route(services) {
  let handler;
  apply({
    logger: { error: assert.fail },
    fiber: {},
    inject(names, install) {
      if (names.every((name) => name in services)) {
        install({ ...services, effect: (fn) => fn() });
      }
    },
    effect: (fn) => fn(),
    webServer: {
      register(value) {
        handler = value.handler;
        return () => {};
      },
    },
  });
  return async (url, body) => {
    let status;
    let result;
    const req = {
      url,
      method: body === undefined ? "GET" : "POST",
      async *[Symbol.asyncIterator]() {
        yield JSON.stringify(body);
      },
    };
    await handler(req, {
      writeHead(value) {
        status = value;
      },
      end(value) {
        result = JSON.parse(value);
      },
    });
    return { status, ...result };
  };
}

test("rc7 settings use the profile entry and preserve optimistic conflicts", async () => {
  let value = { enabled: true, favorites: [] };
  let revision = 1;
  const call = route({
    settings: {
      configure: () => () => {},
      describe: () => [{ ns: "codex-timeline", value, revision }],
      async update(ns, patch, expected) {
        assert.equal(ns, "codex-timeline");
        if (expected !== revision)
          throw Object.assign(new Error("changed"), {
            code: "SETTINGS_CONFLICT",
          });
        value = { ...value, ...patch };
        revision++;
      },
    },
  });
  assert.equal((await call("/codex-timeline/settings")).status, 200);
  const saved = await call("/codex-timeline/settings", {
    patch: { favorites: ["s:1"] },
    expectedRevision: 1,
  });
  assert.deepEqual(saved.value.favorites, ["s:1"]);
  assert.equal(
    (
      await call("/codex-timeline/settings", {
        patch: { favorites: [] },
        expectedRevision: 1,
      })
    ).status,
    409,
  );
});

const events = [
  { seq: 0, time: 1000, type: "turn/start", data: { turn: 1 } },
  {
    seq: 1,
    time: 1010,
    type: "user/message",
    surfaceOp: "append",
    data: {
      turn: 1,
      source: { kind: "user" },
      content: [{ type: "text", text: "needle prompt" }],
    },
  },
  { seq: 2, time: 1100, type: "step/start", data: { turn: 1, step: 0 } },
  {
    seq: 3,
    time: 2250,
    type: "assistant/message",
    surfaceOp: "append",
    data: {
      turn: 1,
      step: 0,
      message: { content: [{ type: "text", text: "needle answer" }] },
      stream: [
        {
          type: "text-chunks",
          time0: 1250,
          index: 0,
          dt: [0],
          texts: ["needle answer"],
        },
      ],
      usage: { inputTokens: 120, outputTokens: 50 },
    },
  },
  {
    seq: 4,
    time: 2500,
    type: "turn/end",
    data: { turn: 1, reason: { kind: "completed" } },
  },
];

test("cold history reads rc7 storage without taking write ownership and closes handles", async () => {
  let closed = 0;
  const call = route({
    sessions: { get: () => undefined },
    sessionPersistence: {
      async open(id, access) {
        assert.equal(id, "cold");
        assert.equal(access, "read");
        return {
          read: async () => ({ events }),
          close: async () => {
            closed++;
          },
        };
      },
    },
  });
  const found = await call("/codex-timeline/search?sessionId=cold&q=needle");
  assert.equal(found.status, 200);
  assert.equal(found.items.length, 1);
  assert.equal(found.items[0].branchSeq, 3);
  assert.equal(closed, 1);
  const lite = await call("/codex-timeline/search?sessionId=cold&lite=1");
  assert.equal(lite.items[0].ttftMs, 150);
  assert.equal(lite.items[0].tokensPerSecond, 50);
});

test("rc7 packed streams preserve projected metrics without assistant/chunk events", () => {
  const { items } = buildTurnIndex(events);
  assert.equal(items[0].ttftMs, 150);
  assert.equal(items[0].tokensPerSecond, 50);
  assert.equal(items[0].inputTokens, 120);
  assert.equal(items[0].outputTokens, 50);
});
