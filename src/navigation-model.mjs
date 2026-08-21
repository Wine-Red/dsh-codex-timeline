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
