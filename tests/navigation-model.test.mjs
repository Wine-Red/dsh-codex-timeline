import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTurnNavigationIndex,
  normalizeSearchText,
  searchSnippet,
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
