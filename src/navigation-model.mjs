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
    const anchorKey = keys.find((key) => chat.nodes.get(key)?.kind === "user");
    if (anchorKey === undefined) continue;
    const user = chat.nodes.get(anchorKey);
    if (user?.kind !== "user") continue;

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
