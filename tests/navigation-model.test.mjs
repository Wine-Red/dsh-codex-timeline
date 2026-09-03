import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTurnNavigationIndex,
  buildTurnIndex,
  buildTurnSearchIndex,
  currentSurfaceSeqs,
  extractEventSearchText,
  normalizeSearchText,
  searchSnippet,
  searchWindowedSource,
  twoLineSummary,
} from "../src/navigation-model.mjs";

function fixture(order = [5, 6]) {
  const nodes = new Map([
    [
      "u5",
      {
        kind: "user",
        data: {
          time: 100,
          content: [{ type: "text", text: "修复分页\n不要抢滚动" }],
        },
      },
    ],
    [
      "a5",
      {
        kind: "assistant-step",
        data: {
          blocks: [
            { kind: "text", text: "已保持锚点。\n流式期间不会回到底部。" },
          ],
        },
      },
    ],
    [
      "tail5",
      {
        kind: "turn-tail",
        data: {
          ttftMs: 1250,
          tokensPerSecond: 88.4,
          closing: { finalNode: { seq: 42 } },
          branchUnavailable: false,
        },
      },
    ],
    ["tool5", { kind: "tool", data: {} }],
    [
      "u6",
      {
        kind: "user",
        data: {
          time: 200,
          content: [{ type: "text", text: "Search MICRO sign" }],
        },
      },
    ],
  ]);
  const turns = new Map([
    [
      5,
      {
        status: "closed",
        start: { time: 90 },
        end: { time: 150, data: { reason: { kind: "completed" } } },
      },
    ],
    [6, { status: "open", start: { time: 190 } }],
  ]);
  return {
    timeline: { turnOrder: order, turns },
    locations: {
      getTurn: (turn) => (turn === 5 ? ["u5", "tool5", "a5", "tail5"] : ["u6"]),
    },
    nodes,
  };
}

test("projects one stable marker per user Turn and keeps official numbering", () => {
  const items = buildTurnNavigationIndex(fixture(), [{ id: "approval" }], true);
  assert.equal(items.length, 2);
  assert.deepEqual(
    items.map(({ id, ordinal, total }) => ({ id, ordinal, total })),
    [
      { id: "turn:5", ordinal: 5, total: 6 },
      { id: "turn:6", ordinal: 6, total: 6 },
    ],
  );
  assert.equal(items[0].answer, "已保持锚点。\n流式期间不会回到底部。");
  assert.equal(items[0].ttftMs, 1250);
  assert.equal(items[0].tokensPerSecond, 88.4);
  assert.equal(items[0].branchSeq, 42);
  assert.equal(items[0].branchUnavailable, false);
  assert.equal(items[1].branchUnavailable, true);
  assert.equal(items[1].status, "waiting");
});

test("history prepend preserves stable ids, ordinals, and the latest total", () => {
  const before = buildTurnNavigationIndex(fixture(), [], false);
  const chat = fixture([3, 5, 6]);
  chat.timeline.turns.set(3, {
    status: "closed",
    end: { data: { reason: { kind: "completed" } } },
  });
  chat.nodes.set("u3", {
    kind: "user",
    data: { time: 50, content: [{ type: "text", text: "earlier" }] },
  });
  const getTurn = chat.locations.getTurn;
  chat.locations.getTurn = (turn) => (turn === 3 ? ["u3"] : getTurn(turn));
  const after = buildTurnNavigationIndex(chat, [], false);
  assert.deepEqual(
    before.map((item) => item.id),
    ["turn:5", "turn:6"],
  );
  assert.deepEqual(
    after.map((item) => item.id),
    ["turn:3", "turn:5", "turn:6"],
  );
  assert.deepEqual(
    after.map((item) => item.ordinal),
    [3, 5, 6],
  );
  assert.ok(after.every((item) => item.total === 6));
});

test("indexes steering Turns too, so every session-index Turn is jumpable", () => {
  const chat = fixture([7]);
  chat.timeline.turns.set(7, {
    status: "closed",
    end: { data: { reason: { kind: "completed" } } },
  });
  chat.nodes.set("s7", {
    kind: "steering",
    data: { time: 250, content: [{ type: "text", text: "steer mid-turn" }] },
  });
  const getTurn = chat.locations.getTurn;
  chat.locations.getTurn = (turn) => (turn === 7 ? ["s7"] : getTurn(turn));
  const items = buildTurnNavigationIndex(chat, [], false);
  const item = items.find((candidate) => candidate.id === "turn:7");
  assert.ok(item !== void 0, "steering Turn must be indexed");
  assert.equal(item.anchorKey, "s7");
  assert.equal(item.summary, "steer mid-turn");
});

test("search normalizes text and returns keyword context", () => {
  const query = normalizeSearchText("ｍｉｃｒｏ");
  const snippet = searchSnippet("prefix Search MICRO sign suffix", query);
  assert.equal(snippet.match, "MICRO");
  assert.match(
    `${snippet.before}${snippet.match}${snippet.after}`,
    /prefix Search MICRO sign suffix/,
  );
  assert.equal(twoLineSummary("one\n\n two\nthree"), "one\ntwo");
});

function searchEvent(seq, type, data, surfaceOp = "append") {
  return { seq, type, time: 1000 + seq, data, surfaceOp };
}

function searchFixture() {
  return [
    searchEvent(0, "turn/start", { turn: 1 }),
    searchEvent(1, "user/message", {
      turn: undefined,
      source: { kind: "user" },
      content: [{ type: "text", text: "修复分页" }],
    }),
    searchEvent(2, "assistant/message", {
      message: {
        content: [{ type: "text", text: "已保持锚点。" }],
      },
    }),
    searchEvent(3, "turn/end", { turn: 1, reason: { kind: "completed" } }),
    searchEvent(4, "turn/start", { turn: 2 }),
    searchEvent(5, "user/message", {
      source: { kind: "user" },
      content: [{ type: "text", text: "Search MICRO sign" }],
    }),
    searchEvent(6, "assistant/message", {
      message: {
        content: [
          { type: "text", text: "全角 ｍｉｃｒｏ 也匹配。" },
          { type: "tool-call", name: "grep", arguments: "MICRO" },
        ],
      },
    }),
    searchEvent(7, "tool/call", { name: "grep", arguments: "MICRO" }),
    searchEvent(8, "todo/write", {
      todos: [{ status: "pending", content: "MICRO todo" }],
    }),
    searchEvent(9, "turn/end", {
      turn: 2,
      reason: { kind: "error", error: { message: "boom" } },
    }),
  ];
}

test("extracts semantic text per event kind", () => {
  assert.equal(extractEventSearchText(searchFixture()[1]), "修复分页");
  assert.equal(
    extractEventSearchText(searchFixture()[6]),
    "全角 ｍｉｃｒｏ 也匹配。\ngrep\nMICRO",
  );
  assert.equal(extractEventSearchText(searchFixture()[7]), "grep\nMICRO");
  assert.equal(
    extractEventSearchText(searchFixture()[8]),
    "pending\nMICRO todo",
  );
  assert.equal(extractEventSearchText(searchFixture()[9]), "error\nboom");
  assert.equal(extractEventSearchText(searchFixture()[0]), "");
});

test("folds the current surface and shadows replaced ranges", () => {
  const events = [
    searchEvent(0, "user/message", { content: [{ type: "text", text: "a" }] }),
    searchEvent(1, "user/message", { content: [{ type: "text", text: "b" }] }),
    searchEvent(
      2,
      "user/message",
      {
        content: [{ type: "text", text: "replacement" }],
        sourceEventSeqs: [0, 1],
      },
      { start: 0, end: 1 },
    ),
  ];
  const current = currentSurfaceSeqs(events);
  assert.deepEqual([...current], [2]);
});

test("projects the complete log into per-Turn search items", () => {
  const { items, total } = buildTurnSearchIndex(searchFixture(), "ｍｉｃｒｏ");
  assert.equal(total, 2);
  assert.deepEqual(
    items.map(({ turn, seq, status }) => ({ turn, seq, status })),
    [{ turn: 2, seq: 5, status: "failed" }],
  );
  assert.equal(items[0].summary, "Search MICRO sign");
  assert.equal(items[0].answer, "全角 ｍｉｃｒｏ 也匹配。");
  assert.match(items[0].source, /MICRO/);
  assert.ok(
    normalizeSearchText(items[0].source).includes(
      normalizeSearchText("ｍｉｃｒｏ"),
    ),
  );
  assert.ok(
    !items[0].source.includes("grep"),
    "tool-call text is not part of the chat index corpus",
  );
});

test("builds the lite index for every Turn without context and marks open turns", () => {
  const events = [
    ...searchFixture(),
    searchEvent(10, "turn/start", { turn: 3 }),
    searchEvent(11, "user/message", {
      source: { kind: "user" },
      content: [{ type: "text", text: "still open" }],
    }),
  ];
  const { items, total } = buildTurnIndex(events);
  assert.equal(total, 3);
  assert.deepEqual(
    items.map(({ turn, status }) => ({ turn, status })),
    [
      { turn: 1, status: "completed" },
      { turn: 2, status: "failed" },
      { turn: 3, status: "unknown" },
    ],
  );
  assert.equal(items[0].summary, "修复分页");
  assert.equal(items[2].summary, "still open");
  assert.ok(items.every((item) => item.source === ""));
  assert.ok(
    items.every((item) => item.seq === void 0 || typeof item.seq === "number"),
  );
});

test("projects per-Turn time, latency, throughput, and token consumption", () => {
  const events = [
    { seq: 0, type: "turn/start", time: 1000, data: { turn: 1 } },
    {
      seq: 1,
      type: "user/message",
      time: 1020,
      surfaceOp: "append",
      data: {
        source: { kind: "user" },
        content: [{ type: "text", text: "measure this turn" }],
      },
    },
    { seq: 2, type: "step/start", time: 1100, data: { turn: 1, step: 0 } },
    {
      seq: 3,
      type: "assistant/chunk",
      time: 1250,
      data: { turn: 1, step: 0, chunk: { type: "text-delta", text: "A" } },
    },
    {
      seq: 4,
      type: "assistant/message",
      time: 2250,
      surfaceOp: "append",
      data: {
        turn: 1,
        step: 0,
        usage: { inputTokens: 120, outputTokens: 50 },
        message: { content: [{ type: "text", text: "Answer" }] },
      },
    },
    {
      seq: 5,
      type: "turn/end",
      time: 2500,
      data: { turn: 1, reason: { kind: "completed" } },
    },
  ];
  const { items } = buildTurnIndex(events);
  assert.equal(items[0].startTime, 1000);
  assert.equal(items[0].endTime, 2500);
  assert.equal(items[0].ttftMs, 150);
  assert.equal(items[0].tokensPerSecond, 50);
  assert.equal(items[0].inputTokens, 120);
  assert.equal(items[0].outputTokens, 50);
});

test("structural turn boundaries need no surface marker", () => {
  const events = [
    { seq: 0, type: "turn/start", time: 1, data: { turn: 1 } },
    {
      seq: 1,
      type: "user/message",
      time: 2,
      data: {
        source: { kind: "user" },
        content: [{ type: "text", text: "hi" }],
      },
      surfaceOp: "append",
    },
    // Real logs carry no surfaceOp on turn/end; the projection must still
    // mark the turn closed (and failed on an error reason).
    {
      seq: 2,
      type: "turn/end",
      time: 3,
      data: { turn: 1, reason: { kind: "completed" } },
    },
    { seq: 3, type: "turn/start", time: 4, data: { turn: 2 } },
    {
      seq: 4,
      type: "user/message",
      time: 5,
      data: {
        source: { kind: "user" },
        content: [{ type: "text", text: "again" }],
      },
      surfaceOp: "append",
    },
    {
      seq: 5,
      type: "turn/end",
      time: 6,
      data: { turn: 2, reason: { kind: "error", error: { message: "boom" } } },
    },
  ];
  const { items } = buildTurnIndex(events);
  assert.deepEqual(
    items.map(({ turn, status }) => ({ turn, status })),
    [
      { turn: 1, status: "completed" },
      { turn: 2, status: "failed" },
    ],
  );
});

test("full-log search skips injected context and non-matching turns", () => {
  const events = [
    searchEvent(0, "turn/start", { turn: 1 }),
    searchEvent(1, "user/message", {
      source: { kind: "plugin", plugin: "compact" },
      content: [{ type: "text", text: "MICRO in context" }],
    }),
    searchEvent(2, "user/message", {
      source: { kind: "user" },
      content: [{ type: "text", text: "unrelated prompt" }],
    }),
    searchEvent(3, "turn/end", { turn: 1, reason: { kind: "completed" } }),
  ];
  const { items, total } = buildTurnSearchIndex(events, "MICRO");
  assert.equal(total, 1);
  assert.equal(items.length, 0, "injected context must not match");
});

test("windows long sources around the match", () => {
  const source = `${"a".repeat(500)} needle ${"b".repeat(500)}`;
  const windowed = searchWindowedSource(source, "needle");
  assert.ok(windowed.startsWith("…"));
  assert.ok(windowed.endsWith("…"));
  assert.match(windowed, /needle/);
  assert.ok(windowed.length < source.length);
  assert.equal(
    searchWindowedSource("short needle text", "needle"),
    "short needle text",
  );
});
