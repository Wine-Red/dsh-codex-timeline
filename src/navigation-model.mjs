/** Pure navigation projection shared by contract tests and upgrade audits. */

export function twoLineSummary(text) {
  const summary = text
    .split(/\r?\n/u)
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("\n");
  return summary.length <= 240 ? summary : `${summary.slice(0, 237)}…`;
}

export function normalizeSearchText(text) {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}

export function searchSnippet(source, normalizedQuery) {
  const display = source.replace(/\s+/gu, " ").trim();
  const index = normalizeSearchText(display).indexOf(normalizedQuery);
  if (index < 0) return { before: "", match: "", after: display.slice(0, 80) };
  const start = Math.max(0, index - 30);
  const matchEnd = Math.min(display.length, index + normalizedQuery.length);
  const end = Math.min(display.length, matchEnd + 48);
  return {
    before: `${start > 0 ? "…" : ""}${display.slice(start, index)}`,
    match: display.slice(index, matchEnd),
    after: `${display.slice(matchEnd, end)}${end < display.length ? "…" : ""}`,
  };
}

const RAIL_WINDOW_DEFAULT = 25;
const RAIL_EDGE_PREVIEW_COUNT = 2;
const RAIL_WHEEL_PIXEL_THRESHOLD = 36;
const RAIL_WHEEL_DISCRETE_THRESHOLD = 80;
const RAIL_WHEEL_IDLE_RESET_MS = 160;
const RAIL_WHEEL_STEP_COOLDOWN_MS = 48;
const RAIL_MOTION_BURST_MS = 120;
const JUMP_SMOOTH_VIEWPORT_LIMIT = 1.5;
const JUMP_SETTLE_MAX_DISTANCE_PX = 88;
const JUMP_SETTLE_VIEWPORT_RATIO = 0.12;
const JUMP_SETTLE_DURATION_MS = 180;

function railWindowLimit(value) {
  return Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : RAIL_WINDOW_DEFAULT;
}

/**
 * Project a fixed-size rail window. A null anchor follows the newest items;
 * otherwise the anchored item stays at the window's leading edge while older
 * history is prepended or a new Turn is appended.
 */
export function deriveRailWindow(
  items,
  visibleLimit = RAIL_WINDOW_DEFAULT,
  anchorId = null,
) {
  const visibleCount = Math.min(items.length, railWindowLimit(visibleLimit));
  const maxStart = Math.max(0, items.length - visibleCount);
  const anchoredStart =
    anchorId === null
      ? maxStart
      : items.findIndex(
          (entry) => entry?.item?.id === anchorId || entry?.id === anchorId,
        );
  const start = Math.max(
    0,
    Math.min(maxStart, anchoredStart < 0 ? maxStart : anchoredStart),
  );
  const end = start + visibleCount;

  return {
    start,
    end,
    maxStart,
    items: items.slice(start, end),
    olderPeeks: items.slice(
      Math.max(0, start - RAIL_EDGE_PREVIEW_COUNT),
      start,
    ),
    newerPeeks: items.slice(
      end,
      Math.min(items.length, end + RAIL_EDGE_PREVIEW_COUNT),
    ),
    hasOlder: start > 0,
    hasNewer: end < items.length,
  };
}

/** Keep preview and interactive entries in one stable keyed motion band. */
export function deriveRailBand(window) {
  const olderPeeks = Array.isArray(window?.olderPeeks) ? window.olderPeeks : [];
  const visible = Array.isArray(window?.items) ? window.items : [];
  const newerPeeks = Array.isArray(window?.newerPeeks) ? window.newerPeeks : [];

  return [
    ...olderPeeks.map((entry, index) => ({
      entry,
      edge: "older",
      depth: olderPeeks.length - index,
      relativeIndex: index - olderPeeks.length,
    })),
    ...visible.map((entry, index) => ({
      entry,
      windowIndex: index,
      relativeIndex: index,
    })),
    ...newerPeeks.map((entry, index) => ({
      entry,
      edge: "newer",
      depth: index + 1,
      relativeIndex: visible.length + index,
    })),
  ];
}

/**
 * Keep the interactive window centered while reserving complete, symmetric
 * slots for edge previews. The reservation is based on capacity rather than
 * the current boundary so the rail never jumps as previews appear/disappear.
 */
export function deriveRailGeometry(
  trackHeight,
  visibleCount,
  markerSpacing,
  edgePreviewCount = RAIL_EDGE_PREVIEW_COUNT,
) {
  const height = Math.max(0, Number.isFinite(trackHeight) ? trackHeight : 0);
  const count = Math.max(
    0,
    Number.isFinite(visibleCount) ? Math.floor(visibleCount) : 0,
  );
  const previews = Math.max(
    0,
    Number.isFinite(edgePreviewCount) ? Math.floor(edgePreviewCount) : 0,
  );
  const preferredGap = Math.max(
    2,
    Number.isFinite(markerSpacing) ? markerSpacing : 10,
  );
  const capacity = Math.max(1, count + previews * 2);
  const gap = Math.max(2, Math.min(preferredGap, (height - 12) / capacity));
  const groupHeight = count * gap;

  return {
    gap,
    groupHeight,
    startOffset: Math.max(0, (height - groupHeight) / 2),
  };
}

/** Map a pointer coordinate to the fixed interactive slot beneath it. */
export function railSlotAtPointer(
  clientY,
  trackTop,
  startOffset,
  gap,
  visibleCount,
) {
  const count = Number.isFinite(visibleCount)
    ? Math.max(0, Math.floor(visibleCount))
    : 0;
  if (
    !Number.isFinite(clientY) ||
    !Number.isFinite(trackTop) ||
    !Number.isFinite(startOffset) ||
    !Number.isFinite(gap) ||
    gap <= 0 ||
    count === 0
  ) {
    return null;
  }

  const localY = clientY - trackTop - startOffset;
  if (localY < 0 || localY >= count * gap) return null;
  return Math.min(count - 1, Math.floor(localY / gap));
}

/** Keep the rail surface measurable even when every visible item is unloaded. */
export function shouldRenderRailSurface(
  enabled,
  favoritesOnly,
  itemCount,
  hasMore,
) {
  return (
    enabled === true &&
    (favoritesOnly === true ||
      (Number.isFinite(itemCount) && itemCount > 0) ||
      hasMore === true)
  );
}

/** Use a shorter interruptible transition for high-frequency wheel bursts. */
export function classifyRailMotion(previousTime, currentTime) {
  if (!Number.isFinite(previousTime) || !Number.isFinite(currentTime)) {
    return "step";
  }
  const elapsed = currentTime - previousTime;
  return elapsed < 0 || elapsed >= RAIL_MOTION_BURST_MS ? "step" : "burst";
}

/** Move a rail window by at most one item and clamp it at both boundaries. */
export function stepRailWindow(start, itemCount, visibleLimit, direction) {
  const visibleCount = Math.min(
    Math.max(0, itemCount),
    railWindowLimit(visibleLimit),
  );
  const maxStart = Math.max(0, itemCount - visibleCount);
  const current = Number.isFinite(start) ? Math.trunc(start) : maxStart;
  const step = Math.sign(Number.isFinite(direction) ? direction : 0);
  return Math.max(0, Math.min(maxStart, current + step));
}

/** Keep a keyboard target inside the fixed rail window with minimal movement. */
export function railWindowStartForIndex(
  start,
  itemIndex,
  itemCount,
  visibleLimit,
) {
  const visibleCount = Math.min(
    Math.max(0, itemCount),
    railWindowLimit(visibleLimit),
  );
  if (visibleCount === 0) return 0;
  const maxStart = Math.max(0, itemCount - visibleCount);
  const current = Math.max(
    0,
    Math.min(maxStart, Number.isFinite(start) ? Math.trunc(start) : maxStart),
  );
  const target = Math.max(
    0,
    Math.min(itemCount - 1, Number.isFinite(itemIndex) ? itemIndex : current),
  );
  if (target < current) return target;
  if (target >= current + visibleCount) {
    return Math.min(maxStart, target - visibleCount + 1);
  }
  return current;
}

/**
 * Normalize coarse mouse-wheel notches and high-resolution trackpad deltas.
 * Coarse events always yield one step. Fine pixel deltas accumulate to one
 * step, reset after an idle pause or direction reversal, and are rate-limited
 * so inertial trackpad events do not race through the rail.
 */
export function accumulateRailWheel(state, input) {
  const previous = {
    accumulated: Number.isFinite(state?.accumulated) ? state.accumulated : 0,
    direction: Number.isFinite(state?.direction) ? state.direction : 0,
    lastEventAt: Number.isFinite(state?.lastEventAt)
      ? state.lastEventAt
      : Number.NEGATIVE_INFINITY,
    lastStepAt: Number.isFinite(state?.lastStepAt)
      ? state.lastStepAt
      : Number.NEGATIVE_INFINITY,
    precision: state?.precision === true,
  };
  const deltaX = Number.isFinite(input?.deltaX) ? input.deltaX : 0;
  const deltaY = Number.isFinite(input?.deltaY) ? input.deltaY : 0;
  const deltaMode = Number.isFinite(input?.deltaMode) ? input.deltaMode : 0;
  const timeStamp = Number.isFinite(input?.timeStamp)
    ? input.timeStamp
    : previous.lastEventAt;

  if (deltaY === 0 || Math.abs(deltaX) >= Math.abs(deltaY)) {
    return {
      ...previous,
      accumulated: 0,
      direction: 0,
      lastEventAt: timeStamp,
      step: 0,
    };
  }

  const direction = Math.sign(deltaY);
  const elapsed = timeStamp - previous.lastEventAt;
  const newGesture =
    previous.direction === 0 ||
    elapsed < 0 ||
    elapsed > RAIL_WHEEL_IDLE_RESET_MS;
  const reset = direction !== previous.direction || newGesture;
  const precision =
    deltaMode === 0 &&
    (newGesture
      ? Math.abs(deltaY) < RAIL_WHEEL_DISCRETE_THRESHOLD
      : previous.precision);

  if (
    deltaMode !== 0 ||
    (!precision && Math.abs(deltaY) >= RAIL_WHEEL_PIXEL_THRESHOLD)
  ) {
    return {
      accumulated: 0,
      direction,
      lastEventAt: timeStamp,
      lastStepAt: timeStamp,
      precision: false,
      step: direction,
    };
  }

  const accumulated = (reset ? 0 : previous.accumulated) + Math.abs(deltaY);
  const cooledDown =
    timeStamp - previous.lastStepAt >= RAIL_WHEEL_STEP_COOLDOWN_MS;
  if (accumulated < RAIL_WHEEL_PIXEL_THRESHOLD || !cooledDown) {
    return {
      ...previous,
      accumulated,
      direction,
      lastEventAt: timeStamp,
      precision,
      step: 0,
    };
  }

  return {
    accumulated: 0,
    direction,
    lastEventAt: timeStamp,
    lastStepAt: timeStamp,
    precision,
    step: direction,
  };
}

function resetRailWheelGesture(state, timeStamp) {
  return accumulateRailWheel(state, {
    deltaX: 1,
    deltaY: 0,
    deltaMode: 0,
    timeStamp,
  });
}

/**
 * Resolve one wheel event against the rail boundaries. The caller prevents the
 * browser default only when `shouldPreventDefault` is true; ignored gestures
 * and boundary events reset residual trackpad input and keep scroll chaining.
 */
export function resolveRailWheel(state, input, start, itemCount, visibleLimit) {
  const current = stepRailWindow(start, itemCount, visibleLimit, 0);
  const release = () => ({
    gesture: resetRailWheelGesture(state, input?.timeStamp),
    start: current,
    step: 0,
    moved: false,
    shouldPreventDefault: false,
  });

  if (
    input?.defaultPrevented === true ||
    input?.ctrlKey === true ||
    input?.metaKey === true ||
    input?.shiftKey === true
  ) {
    return release();
  }

  const deltaX = Number.isFinite(input?.deltaX) ? input.deltaX : 0;
  const deltaY = Number.isFinite(input?.deltaY) ? input.deltaY : 0;
  if (deltaY === 0 || Math.abs(deltaX) >= Math.abs(deltaY)) return release();

  const available = stepRailWindow(current, itemCount, visibleLimit, deltaY);
  if (available === current) return release();

  const gesture = accumulateRailWheel(state, input);
  if (gesture.step === 0) {
    return {
      gesture,
      start: current,
      step: 0,
      moved: false,
      shouldPreventDefault: true,
    };
  }

  const next = stepRailWindow(current, itemCount, visibleLimit, gesture.step);
  return {
    gesture,
    start: next,
    step: gesture.step,
    moved: next !== current,
    shouldPreventDefault: true,
  };
}

/**
 * Keep spatial continuity for nearby materialized Turns without animating a
 * reader through dozens of screens. A target reached through history paging is
 * always placed immediately, then identified with a separate landing cue.
 */
export function resolveJumpBehavior(
  distance,
  viewportHeight,
  reducedMotion = false,
  loadedPages = 0,
) {
  if (reducedMotion === true || loadedPages > 0) return "auto";
  const height = Number.isFinite(viewportHeight)
    ? Math.max(0, viewportHeight)
    : 0;
  const delta = Number.isFinite(distance)
    ? Math.abs(distance)
    : Number.POSITIVE_INFINITY;
  if (height <= 0 || delta > height * JUMP_SMOOTH_VIEWPORT_LIMIT) return "auto";
  return "smooth";
}

/**
 * Turn an otherwise instantaneous long jump into a brief directional arrival.
 * The caller first places the viewport this signed distance before the target,
 * then eases the final segment. Nearby jumps already have native smooth motion;
 * reduced-motion users receive no synthesized movement.
 */
export function resolveJumpSettle(
  distance,
  viewportHeight,
  reducedMotion = false,
  loadedPages = 0,
) {
  if (
    reducedMotion === true ||
    resolveJumpBehavior(
      distance,
      viewportHeight,
      reducedMotion,
      loadedPages,
    ) === "smooth"
  ) {
    return { offset: 0, duration: 0 };
  }
  const height = Number.isFinite(viewportHeight)
    ? Math.max(0, viewportHeight)
    : 0;
  const delta = Number.isFinite(distance) ? distance : 0;
  if (height <= 0 || Math.abs(delta) <= 2) {
    return { offset: 0, duration: 0 };
  }
  const offset =
    Math.sign(delta) *
    Math.min(
      Math.abs(delta),
      JUMP_SETTLE_MAX_DISTANCE_PX,
      height * JUMP_SETTLE_VIEWPORT_RATIO,
    );
  return { offset, duration: JUMP_SETTLE_DURATION_MS };
}

/**
 * History projection stores are allowed to keep a stable backing Map while the
 * materialized Chat order and DOM grow. Treat either semantic or rendered
 * growth as progress so a valid long jump is never stopped by a stale Map size.
 */
export function advanceJumpPagingProgress(progress, snapshot) {
  const previous = progress ?? {};
  const firstKey = snapshot?.firstKey ?? null;
  const orderLength = Number.isFinite(snapshot?.orderLength)
    ? Math.max(0, snapshot.orderLength)
    : 0;
  const anchorCount = Number.isFinite(snapshot?.anchorCount)
    ? Math.max(0, snapshot.anchorCount)
    : 0;
  const advanced =
    firstKey !== (previous.firstKey ?? null) ||
    orderLength >
      (Number.isFinite(previous.orderLength) ? previous.orderLength : 0) ||
    anchorCount >
      (Number.isFinite(previous.anchorCount) ? previous.anchorCount : 0);
  return {
    firstKey,
    orderLength,
    anchorCount,
    stalls: advanced
      ? 0
      : Math.max(0, Number.isFinite(previous.stalls) ? previous.stalls : 0) + 1,
  };
}

function blocksText(blocks) {
  return blocks
    .filter((block) => block.kind === "text" || block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n");
}

function turnStatus(turn, waiting, running) {
  if (turn.status === "open") {
    if (waiting) return "waiting";
    return running ? "inProgress" : "unknown";
  }
  if (turn.status === "closed") {
    return turn.end?.data?.reason?.kind === "error" ? "failed" : "completed";
  }
  return "unknown";
}

// ── full-session search (host route projection) ────────────────────────────
//
// The search route reads the session's COMPLETE persisted log through the
// sessionQuery service and projects it into the same per-Turn index shape the
// browser builds from the loaded chat window. Keeping the projection here makes
// the contract testable without a live host; lib/index.js carries the same
// functions inline because the published package ships lib/ only.

function blockText(block) {
  switch (block?.type) {
    case "text":
      return block.text ?? "";
    case "reasoning":
      return "";
    case "tool-call":
      return joinSearchParts([block.name ?? "", block.arguments ?? ""]);
    case "tool-result":
      return (block.content ?? []).map(blockText).join("\n");
    default:
      return "";
  }
}

function joinSearchParts(parts) {
  return parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join("\n");
}

/** Semantic text of one session event (mirrors dsh-session-query extraction). */
export function extractEventSearchText(event) {
  switch (event?.type) {
    case "user/message":
      return (event.data?.content ?? []).map(blockText).join("\n");
    case "assistant/message":
      return (event.data?.message?.content ?? []).map(blockText).join("\n");
    case "tool/call":
      return joinSearchParts([event.data?.name, event.data?.arguments]);
    case "tool/result":
      return joinSearchParts([
        (event.data?.message?.content ?? []).map(blockText).join("\n"),
        event.data?.error?.name ?? "",
        event.data?.error?.code ?? "",
      ]);
    case "todo/write":
      return joinSearchParts(
        (event.data?.todos ?? []).flatMap((todo) => [
          todo.status,
          todo.content,
        ]),
      );
    case "turn/end":
      return turnEndSearchText(event.data?.reason);
    default:
      return "";
  }
}

function turnEndSearchText(reason) {
  switch (reason?.kind) {
    case "error":
      return joinSearchParts(["error", reason.error?.message]);
    case "aborted":
      return "aborted";
    case "max-tokens":
    case "interrupted":
      return reason.kind;
    case "completed":
      return "";
    default:
      return "";
  }
}

/**
 * Fold the log's current surface sequences (shadowed/replaced events are the
 * model-only copy and cannot be jumped to from the transcript).
 * @param events - complete contiguous event log.
 * @returns Set of seqs currently on the surface.
 */
export function currentSurfaceSeqs(events) {
  const nodes = [];
  for (const event of events) {
    const op = event?.surfaceOp;
    if (op === undefined) continue;
    if (op === "append") {
      nodes.push(event.seq);
      continue;
    }
    const startIdx = nodes.indexOf(op.start);
    const endIdx = nodes.indexOf(op.end);
    if (startIdx >= 0 && endIdx >= startIdx) {
      nodes.splice(startIdx, endIdx - startIdx + 1, event.seq);
    }
  }
  return new Set(nodes);
}

/** One bounded, match-centered source window for the search snippet renderer. */
export function searchWindowedSource(source, query, radius = 300) {
  const display = source.replace(/\s+/gu, " ").trim();
  const normalized = normalizeSearchText(display);
  const index = normalized.indexOf(normalizeSearchText(query));
  if (index < 0) return display.slice(0, 640);
  const start = Math.max(0, index - radius);
  const end = Math.min(
    display.length,
    index + normalizeSearchText(query).length + radius,
  );
  return `${start > 0 ? "…" : ""}${display.slice(start, end)}${
    end < display.length ? "…" : ""
  }`;
}

/** Text-only blocks of an LLM-shaped content array (matches the chat index). */
function contentTextBlocks(content) {
  return (content ?? [])
    .filter((block) => block?.type === "text")
    .map((block) => block.text ?? "")
    .join("\n");
}

/** One per-Turn record projected from the complete log (shared by both modes). */
function projectTurns(events) {
  const current = currentSurfaceSeqs(events);
  const turns = new Map();
  let currentTurn = undefined;
  for (const event of events) {
    if (event?.type === "turn/start") currentTurn = event.data?.turn;
    // Turn boundaries are structural: they carry no surfaceOp, so they must be
    // processed OUTSIDE the surface gate (user/assistant/tool events are).
    if (event?.type === "turn/end") {
      const entry = turns.get(event.data?.turn ?? currentTurn);
      if (entry !== undefined) {
        entry.closed = true;
        if (event.data?.reason?.kind === "error") entry.failed = true;
      }
      continue;
    }
    const turn = currentTurn;
    if (turn === undefined || !current.has(event.seq)) continue;
    let entry = turns.get(turn);
    if (entry === undefined) {
      entry = {
        turn,
        user: [],
        assistants: [],
        failed: false,
        closed: false,
        seq: undefined,
      };
      turns.set(turn, entry);
    }
    if (event.type === "user/message") {
      if (event.data?.source?.kind !== "user") continue;
      const text = contentTextBlocks(event.data?.content).trim();
      if (text === "") continue;
      if (entry.user.length === 0) {
        entry.time = event.time;
        entry.seq = event.seq;
      }
      entry.user.push(text);
    } else if (event.type === "assistant/message") {
      const text = contentTextBlocks(event.data?.message?.content).trim();
      if (text !== "") entry.assistants.push(text);
    }
  }
  return [...turns.values()].sort((a, b) => a.turn - b.turn);
}

/** The browser-side status vocabulary for one projected Turn. */
function turnSearchStatus(entry) {
  return entry.failed ? "failed" : entry.closed ? "completed" : "unknown";
}

/** The log's maximum Turn number, matching the browser index's item total. */
function maxTurnOf(entries) {
  return entries.reduce((max, entry) => Math.max(max, entry.turn), 0);
}

function turnSearchItem(entry) {
  return {
    turn: entry.turn,
    seq: entry.seq,
    time: entry.time,
    status: turnSearchStatus(entry),
    summary: twoLineSummary(entry.user.join("\n")),
    answer:
      entry.assistants.length === 0
        ? ""
        : twoLineSummary(entry.assistants.join("\n")),
  };
}

/**
 * Lite full-session index: one item per Turn (summary, answer, status) WITHOUT
 * the matched context source. The rail uses it to show every Turn of the
 * session while the transcript window stays truncated.
 * @param events - complete contiguous event log (seq order).
 * @returns every Turn item in turn order plus the log's total turn count.
 */
export function buildTurnIndex(events) {
  const entries = projectTurns(events);
  const items = [];
  for (const entry of entries) {
    if (entry.user.length === 0) continue;
    items.push({ ...turnSearchItem(entry), source: "" });
  }
  return { items, total: maxTurnOf(entries) };
}

/**
 * Project the complete log into per-Turn search items, matching the browser
 * index corpus exactly: real user prompts plus assistant text blocks, current
 * surface only, one item per Turn that has a user-authored message.
 * @param events - complete contiguous event log (seq order).
 * @param query - literal search text.
 * @returns matched items in turn order plus the log's total turn count.
 */
export function buildTurnSearchIndex(events, query) {
  const normalizedQuery = normalizeSearchText(query);
  const entries = projectTurns(events);
  const items = [];
  for (const entry of entries) {
    if (entry.user.length === 0) continue;
    const source = [...entry.user, ...entry.assistants].join("\n");
    if (!normalizeSearchText(source).includes(normalizedQuery)) continue;
    items.push({
      ...turnSearchItem(entry),
      source: searchWindowedSource(source, query),
    });
  }
  return { items, total: maxTurnOf(entries) };
}

/** Build exactly one item for each loaded Turn containing a real user node. */
export function buildTurnNavigationIndex(chat, pending, running) {
  const latestOpen = [...chat.timeline.turnOrder]
    .reverse()
    .find((number) => chat.timeline.turns.get(number)?.status === "open");
  const total = chat.timeline.turnOrder.at(-1) ?? 0;
  const items = [];

  for (const turnNumber of chat.timeline.turnOrder) {
    const turn = chat.timeline.turns.get(turnNumber);
    if (turn === undefined) continue;
    const keys = chat.locations.getTurn(turnNumber);
    // Steering messages (sent while the agent is working) become
    // kind="steering" nodes; index them too so every Turn of the session
    // index has a jumpable anchor.
    const anchorKey = keys.find((key) => {
      const kind = chat.nodes.get(key)?.kind;
      return kind === "user" || kind === "steering";
    });
    if (anchorKey === undefined) continue;
    const user = chat.nodes.get(anchorKey);
    if (user?.kind !== "user" && user?.kind !== "steering") continue;

    const nodes = keys.map((key) => chat.nodes.get(key));
    const assistants = nodes.filter((node) => node?.kind === "assistant-step");
    const assistant = assistants.findLast(
      (node) => blocksText(node.data.blocks).trim().length > 0,
    );
    const tail = nodes.find((node) => node?.kind === "turn-tail")?.data;
    const prompt = blocksText(user.data.content);
    const answer =
      assistant === undefined
        ? ""
        : twoLineSummary(blocksText(assistant.data.blocks));
    const searchSource = [
      prompt,
      ...assistants.map((node) => blocksText(node.data.blocks)),
    ].join("\n");

    items.push({
      id: `turn:${turnNumber}`,
      turn: turnNumber,
      ordinal: turnNumber,
      total,
      anchorKey,
      time: user.data.time,
      summary: twoLineSummary(prompt),
      ...(answer === "" ? {} : { answer }),
      searchSource,
      searchText: normalizeSearchText(searchSource),
      status: turnStatus(
        turn,
        pending.length > 0 && latestOpen === turnNumber,
        running,
      ),
      startTime: turn.start?.time,
      endTime: turn.end?.time,
      ...(tail?.closing?.finalNode?.seq === undefined
        ? {}
        : { branchSeq: tail.closing.finalNode.seq }),
      branchUnavailable: tail?.branchUnavailable ?? true,
      ...(tail?.ttftMs === undefined ? {} : { ttftMs: tail.ttftMs }),
      ...(tail?.tokensPerSecond === undefined
        ? {}
        : { tokensPerSecond: tail.tokensPerSecond }),
    });
  }

  return items;
}
