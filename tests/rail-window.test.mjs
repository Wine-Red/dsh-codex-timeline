import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceJumpPagingProgress,
  accumulateRailWheel,
  deriveRailBand,
  deriveRailGeometry,
  deriveRailWindow,
  classifyRailMotion,
  railSlotAtPointer,
  railWindowStartForIndex,
  resolveJumpBehavior,
  resolveJumpSettle,
  resolveRailWheel,
  shouldRenderRailSurface,
  stepRailWindow,
} from "../src/navigation-model.mjs";

const items = (from, to) =>
  Array.from({ length: to - from + 1 }, (_, index) => ({
    id: `turn:${from + index}`,
  }));

const ids = (window) => window.items.map((item) => item.id);
const peekIds = (entries) => entries.map((item) => item.id);

test("uses spatial motion only for nearby already-materialized jumps", () => {
  assert.equal(resolveJumpBehavior(0, 800), "smooth");
  assert.equal(resolveJumpBehavior(1200, 800), "smooth");
  assert.equal(resolveJumpBehavior(1201, 800), "auto");
  assert.equal(resolveJumpBehavior(200, 800, true), "auto");
  assert.equal(resolveJumpBehavior(200, 800, false, 1), "auto");
  assert.equal(resolveJumpBehavior(Number.NaN, 800), "auto");
  assert.equal(resolveJumpBehavior(20, 0), "auto");
});

test("adds only a short directional settle to instantaneous jumps", () => {
  assert.deepEqual(resolveJumpSettle(1201, 800), {
    offset: 88,
    duration: 180,
  });
  assert.deepEqual(resolveJumpSettle(-1201, 800), {
    offset: -88,
    duration: 180,
  });
  assert.deepEqual(resolveJumpSettle(200, 400, false, 1), {
    offset: 48,
    duration: 180,
  });
  assert.deepEqual(resolveJumpSettle(1200, 800), {
    offset: 0,
    duration: 0,
  });
  assert.deepEqual(resolveJumpSettle(1201, 800, true), {
    offset: 0,
    duration: 0,
  });
  assert.deepEqual(resolveJumpSettle(Number.NaN, 800, false, 1), {
    offset: 0,
    duration: 0,
  });
});

test("recognizes semantic or DOM growth across long history jumps", () => {
  const initial = {
    firstKey: "node-900",
    orderLength: 100,
    anchorCount: 105,
    stalls: 2,
  };
  assert.deepEqual(
    advanceJumpPagingProgress(initial, {
      firstKey: "node-700",
      orderLength: 100,
      anchorCount: 105,
    }),
    {
      firstKey: "node-700",
      orderLength: 100,
      anchorCount: 105,
      stalls: 0,
    },
  );
  assert.equal(
    advanceJumpPagingProgress(initial, {
      firstKey: "node-900",
      orderLength: 100,
      anchorCount: 433,
    }).stalls,
    0,
  );
  assert.equal(
    advanceJumpPagingProgress(initial, {
      firstKey: "node-900",
      orderLength: 100,
      anchorCount: 105,
    }).stalls,
    3,
  );
});

test("defaults to the newest 25 items without changing the visible count", () => {
  const window = deriveRailWindow(items(1, 60));

  assert.equal(window.start, 35);
  assert.equal(window.end, 60);
  assert.equal(window.maxStart, 35);
  assert.equal(window.items.length, 25);
  assert.deepEqual(
    ids(window),
    items(36, 60).map((item) => item.id),
  );
  assert.deepEqual(
    window.olderPeeks.map((item) => item.id),
    ["turn:34", "turn:35"],
  );
  assert.deepEqual(window.newerPeeks, []);
  assert.equal(window.hasOlder, true);
  assert.equal(window.hasNewer, false);
});

test("moves exactly one item per step and exposes two graded edge previews", () => {
  const all = items(1, 60);
  const latest = deriveRailWindow(all, 25);
  const olderStart = stepRailWindow(latest.start, all.length, 25, -999);
  const older = deriveRailWindow(all, 25, all[olderStart].id);

  assert.equal(olderStart, 34);
  assert.deepEqual(
    ids(older),
    items(35, 59).map((item) => item.id),
  );
  assert.deepEqual(peekIds(older.olderPeeks), ["turn:33", "turn:34"]);
  assert.deepEqual(peekIds(older.newerPeeks), ["turn:60"]);
  assert.equal(stepRailWindow(older.start, all.length, 25, 1), 35);
});

test("edge previews degrade from two to one to none at real boundaries", () => {
  const all = items(1, 27);
  const oldest = deriveRailWindow(all, 25, "turn:1");
  const middle = deriveRailWindow(all, 25, "turn:2");
  const newest = deriveRailWindow(all, 25);

  assert.deepEqual(peekIds(oldest.olderPeeks), []);
  assert.deepEqual(peekIds(oldest.newerPeeks), ["turn:26", "turn:27"]);
  assert.deepEqual(peekIds(middle.olderPeeks), ["turn:1"]);
  assert.deepEqual(peekIds(middle.newerPeeks), ["turn:27"]);
  assert.deepEqual(peekIds(newest.olderPeeks), ["turn:1", "turn:2"]);
  assert.deepEqual(peekIds(newest.newerPeeks), []);
});

test("middle windows keep 25 interactive items separate from four previews", () => {
  const window = deriveRailWindow(items(1, 60), 25, "turn:21");
  const visible = new Set(peekIds(window.items));
  const previews = [...window.olderPeeks, ...window.newerPeeks];

  assert.deepEqual(peekIds(window.items), peekIds(items(21, 45)));
  assert.deepEqual(peekIds(window.olderPeeks), ["turn:19", "turn:20"]);
  assert.deepEqual(peekIds(window.newerPeeks), ["turn:46", "turn:47"]);
  assert.equal(
    previews.some((item) => visible.has(item.id)),
    false,
  );
  assert.equal(new Set(peekIds(previews)).size, 4);
});

test("one stable band carries boundary items between preview and window roles", () => {
  const all = items(1, 60);
  const before = deriveRailBand(deriveRailWindow(all, 25, "turn:21"));
  const after = deriveRailBand(deriveRailWindow(all, 25, "turn:22"));
  const byId = (band, id) => band.find(({ entry }) => entry.id === id);

  assert.equal(before.length, 29);
  assert.deepEqual(
    before.map(({ relativeIndex }) => relativeIndex),
    Array.from({ length: 29 }, (_, index) => index - 2),
  );

  assert.equal(byId(before, "turn:21").windowIndex, 0);
  assert.equal(byId(before, "turn:21").relativeIndex, 0);
  assert.equal(byId(after, "turn:21").edge, "older");
  assert.equal(byId(after, "turn:21").depth, 1);
  assert.equal(byId(after, "turn:21").relativeIndex, -1);

  assert.equal(byId(before, "turn:46").edge, "newer");
  assert.equal(byId(before, "turn:46").relativeIndex, 25);
  assert.equal(byId(after, "turn:46").windowIndex, 24);
  assert.equal(byId(after, "turn:46").relativeIndex, 24);

  for (const previous of before.slice(1)) {
    const next = byId(after, previous.entry.id);
    assert.equal(next.relativeIndex, previous.relativeIndex - 1);
  }
});

test("clamps both boundaries and keeps the configured window size", () => {
  for (const limit of [5, 25, 50]) {
    const all = items(1, 60);
    const top = deriveRailWindow(all, limit, "turn:1");
    const bottom = deriveRailWindow(all, limit);

    assert.equal(top.items.length, limit);
    assert.equal(bottom.items.length, limit);
    assert.equal(stepRailWindow(0, all.length, limit, -1), 0);
    assert.equal(
      stepRailWindow(bottom.maxStart, all.length, limit, 1),
      bottom.maxStart,
    );
    assert.deepEqual(top.olderPeeks, []);
    assert.deepEqual(peekIds(top.newerPeeks), [
      `turn:${limit + 1}`,
      `turn:${limit + 2}`,
    ]);
  }
});

test("shows every item when the session is shorter than the limit", () => {
  const window = deriveRailWindow(items(1, 8), 25);

  assert.equal(window.start, 0);
  assert.equal(window.items.length, 8);
  assert.deepEqual(window.olderPeeks, []);
  assert.deepEqual(window.newerPeeks, []);
  assert.equal(stepRailWindow(0, 8, 25, 1), 0);
});

test("stable id anchoring survives prepends and appends while null follows latest", () => {
  const original = items(11, 60);
  const anchored = deriveRailWindow(original, 25, "turn:30");
  const expanded = items(1, 61);
  const preserved = deriveRailWindow(expanded, 25, "turn:30");
  const latest = deriveRailWindow(expanded, 25, null);

  assert.equal(anchored.items[0].id, "turn:30");
  assert.deepEqual(ids(preserved), ids(anchored));
  assert.deepEqual(
    ids(latest),
    items(37, 61).map((item) => item.id),
  );
});

test("missing anchors and invalid limits fail safely to the latest window", () => {
  const all = items(1, 30);

  assert.deepEqual(
    ids(deriveRailWindow(all, 0, "turn:missing")),
    items(6, 30).map((item) => item.id),
  );
  assert.equal(stepRailWindow(undefined, 30, 25, 0), 5);
});

test("window invariants hold across short, exact, and long sessions", () => {
  for (let total = 0; total <= 120; total += 1) {
    const all = total === 0 ? [] : items(1, total);
    for (const limit of [5, 25, 50]) {
      const anchors = [null, "turn:missing"];
      if (total > 0) {
        anchors.push("turn:1", `turn:${Math.ceil(total / 2)}`, `turn:${total}`);
      }
      for (const anchor of anchors) {
        const window = deriveRailWindow(all, limit, anchor);
        assert.equal(window.items.length, Math.min(total, limit));
        assert.ok(window.start >= 0);
        assert.ok(window.start <= window.maxStart);
        assert.equal(window.end, window.start + window.items.length);
        assert.equal(window.hasOlder, window.start > 0);
        assert.equal(window.hasNewer, window.end < total);
        assert.equal(window.olderPeeks.length > 0, window.hasOlder);
        assert.equal(window.newerPeeks.length > 0, window.hasNewer);
        assert.ok(window.olderPeeks.length <= 2);
        assert.ok(window.newerPeeks.length <= 2);
      }
    }
  }
});

test("rail geometry permanently reserves two complete preview slots per edge", () => {
  const roomy = deriveRailGeometry(800, 25, 15, 2);
  const cramped = deriveRailGeometry(360, 25, 15, 2);

  assert.deepEqual(roomy, {
    gap: 15,
    groupHeight: 375,
    startOffset: 212.5,
  });
  assert.ok(cramped.startOffset >= 2 * cramped.gap);
  assert.ok(360 - cramped.startOffset - cramped.groupHeight >= 2 * cramped.gap);

  // Geometry depends on fixed capacity, never on the current window boundary.
  for (const anchor of ["turn:1", "turn:2", "turn:20", null]) {
    const window = deriveRailWindow(items(1, 60), 25, anchor);
    assert.equal(window.items.length, 25);
    assert.deepEqual(
      deriveRailGeometry(360, window.items.length, 15, 2),
      cramped,
    );
  }

  const noOverflow = deriveRailGeometry(360, 8, 15, 0);
  assert.ok(noOverflow.gap >= cramped.gap);
});

test("maps a stationary pointer to the fixed interactive rail slot", () => {
  const trackTop = 100;
  const startOffset = 20;
  const gap = 10;

  assert.equal(railSlotAtPointer(120, trackTop, startOffset, gap, 25), 0);
  assert.equal(railSlotAtPointer(129.999, trackTop, startOffset, gap, 25), 0);
  assert.equal(railSlotAtPointer(130, trackTop, startOffset, gap, 25), 1);
  assert.equal(railSlotAtPointer(369.999, trackTop, startOffset, gap, 25), 24);
  assert.equal(
    railSlotAtPointer(119.999, trackTop, startOffset, gap, 25),
    null,
  );
  assert.equal(railSlotAtPointer(370, trackTop, startOffset, gap, 25), null);
  assert.equal(railSlotAtPointer(120, trackTop, startOffset, 0, 25), null);
  assert.equal(railSlotAtPointer(120, trackTop, startOffset, gap, 0), null);
});

test("renders before anchor measurement for one loaded or unloaded favorite item", () => {
  assert.equal(shouldRenderRailSurface(true, false, 1, false), true);
  assert.equal(shouldRenderRailSurface(true, true, 0, false), true);
  assert.equal(shouldRenderRailSurface(true, false, 0, true), true);
  assert.equal(shouldRenderRailSurface(true, false, 0, false), false);
  assert.equal(shouldRenderRailSurface(false, true, 1, true), false);

  assert.deepEqual(deriveRailGeometry(610, 1, 10, 0), {
    gap: 10,
    groupHeight: 10,
    startOffset: 300,
  });
});

test("stable item transforms reveal one-step scroll direction", () => {
  const all = items(1, 60);
  const gap = 15;
  const start = deriveRailWindow(all, 25, "turn:20");
  const newer = deriveRailWindow(all, 25, "turn:21");
  const older = deriveRailWindow(all, 25, "turn:19");
  const offset = (window, id) =>
    window.items.findIndex((item) => item.id === id) * gap;

  assert.equal(offset(newer, "turn:21") - offset(start, "turn:21"), -gap);
  assert.equal(offset(older, "turn:20") - offset(start, "turn:20"), gap);
});

test("motion stays interruptible with a shorter transition during bursts", () => {
  assert.equal(classifyRailMotion(Number.NEGATIVE_INFINITY, 0), "step");
  assert.equal(classifyRailMotion(0, 119), "burst");
  assert.equal(classifyRailMotion(0, 120), "step");
  assert.equal(classifyRailMotion(120, 100), "step");
});

test("keyboard targets cross windows with the smallest possible shift", () => {
  assert.equal(railWindowStartForIndex(10, 9, 60, 25), 9);
  assert.equal(railWindowStartForIndex(10, 10, 60, 25), 10);
  assert.equal(railWindowStartForIndex(10, 34, 60, 25), 10);
  assert.equal(railWindowStartForIndex(10, 35, 60, 25), 11);
  assert.equal(railWindowStartForIndex(10, 0, 60, 25), 0);
  assert.equal(railWindowStartForIndex(10, 59, 60, 25), 35);
  assert.equal(railWindowStartForIndex(0, 0, 0, 25), 0);
});

test("coarse wheel events yield one step regardless of magnitude", () => {
  for (const input of [
    { deltaY: 120, deltaMode: 0, timeStamp: 0 },
    { deltaY: 3, deltaMode: 1, timeStamp: 1 },
    { deltaY: -1, deltaMode: 2, timeStamp: 2 },
  ]) {
    const result = accumulateRailWheel(undefined, input);
    assert.equal(result.step, Math.sign(input.deltaY));
  }

  assert.equal(
    accumulateRailWheel(undefined, {
      deltaY: 1000,
      deltaMode: 0,
      timeStamp: 0,
    }).step,
    1,
  );

  const firstNotch = accumulateRailWheel(undefined, {
    deltaY: 100,
    deltaMode: 0,
    timeStamp: 0,
  });
  const secondNotch = accumulateRailWheel(firstNotch, {
    deltaY: 100,
    deltaMode: 0,
    timeStamp: 10,
  });
  assert.equal(firstNotch.step, 1);
  assert.equal(secondNotch.step, 1);
});

test("fine trackpad deltas accumulate, cool down, and then step", () => {
  let state = accumulateRailWheel(undefined, {
    deltaY: 12,
    deltaMode: 0,
    timeStamp: 0,
  });
  assert.equal(state.step, 0);

  state = accumulateRailWheel(state, {
    deltaY: 12,
    deltaMode: 0,
    timeStamp: 16,
  });
  assert.equal(state.step, 0);

  state = accumulateRailWheel(state, {
    deltaY: 12,
    deltaMode: 0,
    timeStamp: 32,
  });
  assert.equal(state.step, 1);

  state = accumulateRailWheel(state, {
    deltaY: 12,
    deltaMode: 0,
    timeStamp: 48,
  });
  assert.equal(state.step, 0);

  state = accumulateRailWheel(state, {
    deltaY: 24,
    deltaMode: 0,
    timeStamp: 80,
  });
  assert.equal(state.step, 1);
});

test("large inertial deltas stay rate-limited after a precision gesture starts", () => {
  let state = accumulateRailWheel(undefined, {
    deltaY: 20,
    deltaMode: 0,
    timeStamp: 0,
  });
  assert.equal(state.precision, true);
  assert.equal(state.step, 0);

  state = accumulateRailWheel(state, {
    deltaY: 90,
    deltaMode: 0,
    timeStamp: 16,
  });
  assert.equal(state.precision, true);
  assert.equal(state.step, 1);

  const reversed = accumulateRailWheel(state, {
    deltaY: -100,
    deltaMode: 0,
    timeStamp: 24,
  });
  assert.equal(reversed.precision, true);
  assert.equal(reversed.step, 0);

  state = accumulateRailWheel(state, {
    deltaY: 100,
    deltaMode: 0,
    timeStamp: 24,
  });
  assert.equal(state.step, 0);

  state = accumulateRailWheel(state, {
    deltaY: 100,
    deltaMode: 0,
    timeStamp: 64,
  });
  assert.equal(state.step, 1);
});

test("trackpad residue resets on direction changes, idle pauses, and horizontal gestures", () => {
  const partial = accumulateRailWheel(undefined, {
    deltaY: 20,
    timeStamp: 0,
  });
  const reversed = accumulateRailWheel(partial, {
    deltaY: -20,
    timeStamp: 10,
  });
  const idle = accumulateRailWheel(partial, {
    deltaY: 20,
    timeStamp: 200,
  });
  const horizontal = accumulateRailWheel(partial, {
    deltaX: 20,
    deltaY: 10,
    timeStamp: 10,
  });

  assert.equal(reversed.step, 0);
  assert.equal(reversed.accumulated, 20);
  assert.equal(reversed.direction, -1);
  assert.equal(idle.step, 0);
  assert.equal(idle.accumulated, 20);
  assert.equal(horizontal.step, 0);
  assert.equal(horizontal.accumulated, 0);
});

test("wheel policy resets residue for horizontal, modified, and boundary events", () => {
  let resolution = resolveRailWheel(
    undefined,
    { deltaY: 20, timeStamp: 0 },
    10,
    60,
    25,
  );
  assert.equal(resolution.shouldPreventDefault, true);
  assert.equal(resolution.moved, false);
  assert.equal(resolution.gesture.accumulated, 20);

  resolution = resolveRailWheel(
    resolution.gesture,
    { deltaX: 20, deltaY: 10, timeStamp: 10 },
    resolution.start,
    60,
    25,
  );
  assert.equal(resolution.shouldPreventDefault, false);
  assert.equal(resolution.gesture.accumulated, 0);

  resolution = resolveRailWheel(
    resolution.gesture,
    { deltaY: 16, timeStamp: 20 },
    resolution.start,
    60,
    25,
  );
  assert.equal(resolution.moved, false);
  assert.equal(resolution.gesture.accumulated, 16);

  const partial = resolveRailWheel(
    undefined,
    { deltaY: 30, timeStamp: 0 },
    10,
    60,
    25,
  );
  const boundary = resolveRailWheel(
    partial.gesture,
    { deltaY: -10, timeStamp: 10 },
    0,
    60,
    25,
  );
  assert.equal(boundary.shouldPreventDefault, false);
  assert.equal(boundary.gesture.accumulated, 0);

  for (const modifier of ["ctrlKey", "metaKey", "shiftKey"]) {
    const modified = resolveRailWheel(
      partial.gesture,
      { deltaY: 100, [modifier]: true, timeStamp: 10 },
      10,
      60,
      25,
    );
    assert.equal(modified.shouldPreventDefault, false);
    assert.equal(modified.gesture.accumulated, 0);
  }
});

test("wheel policy captures only movable directions and advances one item", () => {
  const middle = resolveRailWheel(
    undefined,
    { deltaY: 100, timeStamp: 0 },
    10,
    60,
    25,
  );
  const top = resolveRailWheel(
    undefined,
    { deltaY: -100, timeStamp: 0 },
    0,
    60,
    25,
  );
  const bottom = resolveRailWheel(
    undefined,
    { deltaY: 100, timeStamp: 0 },
    35,
    60,
    25,
  );

  assert.equal(middle.shouldPreventDefault, true);
  assert.equal(middle.moved, true);
  assert.equal(middle.start, 11);
  assert.equal(middle.step, 1);
  assert.equal(top.shouldPreventDefault, false);
  assert.equal(top.start, 0);
  assert.equal(bottom.shouldPreventDefault, false);
  assert.equal(bottom.start, 35);
});

test("rapid coarse wheel input never drops steps and releases after the boundary", () => {
  let start = 10;
  let gesture;
  for (let index = 0; index < 6; index += 1) {
    const resolution = resolveRailWheel(
      gesture,
      { deltaY: 100, deltaMode: 0, timeStamp: index * 8 },
      start,
      60,
      25,
    );
    assert.equal(resolution.start, 11 + index);
    assert.equal(resolution.moved, true);
    assert.equal(resolution.shouldPreventDefault, true);
    start = resolution.start;
    gesture = resolution.gesture;
  }

  start = 33;
  gesture = undefined;
  const movement = [];
  for (let index = 0; index < 5; index += 1) {
    const resolution = resolveRailWheel(
      gesture,
      { deltaY: 100, deltaMode: 0, timeStamp: index * 8 },
      start,
      60,
      25,
    );
    movement.push([
      resolution.start,
      resolution.moved,
      resolution.shouldPreventDefault,
    ]);
    start = resolution.start;
    gesture = resolution.gesture;
  }
  assert.deepEqual(movement, [
    [34, true, true],
    [35, true, true],
    [35, false, false],
    [35, false, false],
    [35, false, false],
  ]);
});
