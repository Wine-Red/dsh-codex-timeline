import { SettingsConflictError } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";
//#region src/settings.ts
/**
 * The timeline user preferences are persisted in the Host user-settings
 * document (settings.yaml) — the same storage every other plugin uses — rather
 * than browser localStorage. The web settings wire only exposes an explicit
 * namespace allowlist, so this plugin serves its own small HTTP route that
 * reads and writes the namespace directly through the Host settings seam.
 */
const TIMELINE_SETTINGS_NAMESPACE = "dsh-codex-timeline";
const TimelineSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  favorites: z.array(z.string()).default([]),
  side: z.union([z.const("left"), z.const("right")]).default("left"),
  leftOffset: z.number().step(1).min(0).max(120).default(0),
  centerOffset: z.number().step(1).min(-200).max(200).default(0),
  markerSpacing: z.number().step(1).min(6).max(40).default(10),
  recentTurns: z.number().step(1).min(5).max(50).default(25),
});
const TIMELINE_SETTING_KEYS = [
  "enabled",
  "favorites",
  "side",
  "leftOffset",
  "centerOffset",
  "markerSpacing",
  "recentTurns",
];
function publicTimelineSettings(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  return Object.fromEntries(
    TIMELINE_SETTING_KEYS.filter((key) =>
      Object.prototype.hasOwnProperty.call(value, key),
    ).map((key) => [key, value[key]]),
  );
}
//#endregion
//#region src/settings-route.ts
/** Write a JSON error envelope. */
function jsonError(res, status, code, message) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ ok: false, error: { code, message } }));
}
/** Write a JSON success envelope, spreading the extra fields into it. */
function jsonOk(res, value) {
  res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ ok: true, ...value }));
}
/** Read and parse a bounded JSON request body; empty bodies yield {}. */
async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString("utf8");
  if (text.trim() === "") return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("request body is not valid JSON");
  }
}
/** Serve GET (read) and POST (patch) for /codex-timeline/settings. */
function settingsRouteHandler(getFace) {
  return async (req, res) => {
    const pathname = new URL(req.url ?? "/", "http://dsh.internal").pathname;
    if (pathname !== "/codex-timeline/settings") {
      jsonError(
        res,
        404,
        "not-found",
        `unknown codex-timeline route "${pathname}"`,
      );
      return;
    }
    const face = getFace();
    if (face === void 0) {
      jsonError(
        res,
        503,
        "settings-unavailable",
        "the settings service is not mounted in this deployment",
      );
      return;
    }
    if (req.method === "GET") {
      jsonOk(res, face.get());
      return;
    }
    if (req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const patch = body?.patch;
        if (
          patch === null ||
          typeof patch !== "object" ||
          Array.isArray(patch)
        ) {
          jsonError(res, 400, "bad-request", "patch must be a plain object");
          return;
        }
        const expectedRevision =
          typeof body?.expectedRevision === "number"
            ? body.expectedRevision
            : undefined;
        jsonOk(res, await face.update(patch, expectedRevision));
      } catch (error) {
        if (error instanceof SettingsConflictError) {
          jsonError(res, 409, "settings-conflict", error.message);
        } else {
          jsonError(
            res,
            400,
            "settings-rejected",
            error instanceof Error ? error.message : String(error),
          );
        }
      }
      return;
    }
    jsonError(res, 405, "method-not-allowed", "method not allowed");
  };
}
//#endregion
//#region src/search.ts
/**
 * Full-session search projection: reads the complete persisted log through the
 * sessionQuery service and returns one item per matched Turn, using exactly the
 * corpus the browser index searches (real user prompts + assistant text
 * blocks, current surface only). Mirrors src/navigation-model.mjs; the package
 * ships lib/ only, so the projection lives here inline.
 */
const SEARCH_QUERY_MAX = 500;
const SEARCH_LIMIT_DEFAULT = 100;
const SEARCH_LIMIT_MAX = 200;

/** Unicode-fold, case-fold and collapse whitespace for literal matching. */
function normalizeSearchTextLocal(text) {
  return String(text ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}

/** First two non-empty lines, capped at 240 characters. */
function twoLineSummaryLocal(text) {
  const summary = String(text ?? "")
    .split(/\r?\n/u)
    .map((line) => line.replace(/\s+/gu, " ").trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("\n");
  return summary.length <= 240 ? summary : `${summary.slice(0, 237)}…`;
}

/** Text-only blocks of an LLM-shaped content array (matches the chat index). */
function searchContentTextBlocks(content) {
  return (content ?? [])
    .filter((block) => block?.type === "text")
    .map((block) => block.text ?? "")
    .join("\n");
}

/** Fold the log's current surface sequences (shadowed events are model-only). */
function searchCurrentSurfaceSeqs(events) {
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
function searchWindowedSource(source, query, radius = 300) {
  const display = source.replace(/\s+/gu, " ").trim();
  const normalized = normalizeSearchTextLocal(display);
  const normalizedQuery = normalizeSearchTextLocal(query);
  const index = normalized.indexOf(normalizedQuery);
  if (index < 0) return display.slice(0, 640);
  const start = Math.max(0, index - radius);
  const end = Math.min(display.length, index + normalizedQuery.length + radius);
  return `${start > 0 ? "…" : ""}${display.slice(start, end)}${
    end < display.length ? "…" : ""
  }`;
}

/** One per-Turn record projected from the complete log (shared by both modes). */
function searchIsTokenDelta(chunk) {
  if (chunk?.type === "text-delta" || chunk?.type === "reasoning-delta")
    return chunk.text !== "";
  if (chunk?.type === "tool-call-delta")
    return chunk.argumentsDelta !== "" || chunk.name !== undefined;
  return false;
}

function searchUsageTokens(usage, key) {
  const value = usage?.[key];
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function createProjectedTurn(turn) {
  return {
    turn,
    user: [],
    assistants: [],
    failed: false,
    closed: false,
    seq: undefined,
    lastSurfaceSeq: undefined,
    branchSeq: undefined,
    branchUnavailable: true,
    firstStep: undefined,
    firstStepTtftMs: undefined,
    decodeMs: 0,
    inputTokens: 0,
    outputTokens: 0,
    hasInputTokens: false,
    hasOutputTokens: false,
    openStep: undefined,
  };
}

function projectedTurn(turns, turn) {
  let entry = turns.get(turn);
  if (entry === undefined) {
    entry = createProjectedTurn(turn);
    turns.set(turn, entry);
  }
  return entry;
}

function projectTurns(events) {
  const current = searchCurrentSurfaceSeqs(events);
  const turns = new Map();
  let currentTurn;
  for (const event of events) {
    if (event?.type === "turn/start") {
      currentTurn = event.data?.turn;
      if (Number.isSafeInteger(currentTurn)) {
        projectedTurn(turns, currentTurn).startTime = event.time;
      }
    }
    const eventTurn = Number.isSafeInteger(event?.data?.turn)
      ? event.data.turn
      : currentTurn;
    if (Number.isSafeInteger(eventTurn)) {
      const metricEntry = projectedTurn(turns, eventTurn);
      if (event.type === "step/start") {
        metricEntry.openStep = {
          step: event.data?.step,
          startTime: event.time,
          firstTokenTime: undefined,
        };
      } else if (event.type === "assistant/chunk") {
        const open = metricEntry.openStep;
        if (
          open !== undefined &&
          open.step === event.data?.step &&
          open.firstTokenTime === undefined &&
          searchIsTokenDelta(event.data?.chunk)
        ) {
          open.firstTokenTime = event.time;
        }
      } else if (event.type === "assistant/message") {
        const open = metricEntry.openStep;
        if (open !== undefined && open.step === event.data?.step) {
          if (open.firstTokenTime !== undefined) {
            const ttftMs = Math.max(0, open.firstTokenTime - open.startTime);
            if (
              metricEntry.firstStep === undefined ||
              Number(event.data?.step) < metricEntry.firstStep
            ) {
              metricEntry.firstStep = Number(event.data?.step);
              metricEntry.firstStepTtftMs = ttftMs;
            }
            const outputTokens = searchUsageTokens(
              event.data?.usage,
              "outputTokens",
            );
            if (outputTokens !== undefined) {
              metricEntry.decodeMs += Math.max(
                0,
                event.time - open.firstTokenTime,
              );
              metricEntry.outputTokens += outputTokens;
              metricEntry.hasOutputTokens = true;
            }
          }
          const inputTokens = searchUsageTokens(
            event.data?.usage,
            "inputTokens",
          );
          if (inputTokens !== undefined) {
            metricEntry.inputTokens += inputTokens;
            metricEntry.hasInputTokens = true;
          }
          metricEntry.openStep = undefined;
        }
      }
    }
    // Turn boundaries are structural: they carry no surfaceOp, so they must be
    // processed OUTSIDE the surface gate (user/assistant/tool events are).
    if (event?.type === "turn/end") {
      const entry = turns.get(event.data?.turn ?? currentTurn);
      if (entry !== undefined) {
        entry.closed = true;
        entry.endTime = event.time;
        if (event.data?.reason?.kind === "error") entry.failed = true;
        entry.branchSeq = entry.lastSurfaceSeq;
        entry.branchUnavailable = entry.branchSeq === undefined;
      }
      continue;
    }
    const turn = currentTurn;
    if (turn === undefined || !current.has(event.seq)) continue;
    const entry = projectedTurn(turns, turn);
    entry.lastSurfaceSeq = event.seq;
    if (event.type === "user/message") {
      if (event.data?.source?.kind !== "user") continue;
      const text = searchContentTextBlocks(event.data?.content).trim();
      if (text === "") continue;
      if (entry.user.length === 0) {
        entry.time = event.time;
        entry.seq = event.seq;
      }
      entry.user.push(text);
    } else if (event.type === "assistant/message") {
      const text = searchContentTextBlocks(event.data?.message?.content).trim();
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
    startTime: entry.startTime,
    endTime: entry.endTime,
    status: turnSearchStatus(entry),
    branchSeq: entry.branchSeq,
    branchUnavailable: entry.branchUnavailable,
    ...(entry.firstStepTtftMs === undefined
      ? {}
      : { ttftMs: entry.firstStepTtftMs }),
    ...(entry.decodeMs > 0 && entry.hasOutputTokens
      ? { tokensPerSecond: entry.outputTokens / (entry.decodeMs / 1000) }
      : {}),
    ...(entry.hasInputTokens ? { inputTokens: entry.inputTokens } : {}),
    ...(entry.hasOutputTokens ? { outputTokens: entry.outputTokens } : {}),
    summary: twoLineSummaryLocal(entry.user.join("\n")),
    answer:
      entry.assistants.length === 0
        ? ""
        : twoLineSummaryLocal(entry.assistants.join("\n")),
  };
}

/**
 * Lite full-session index: one item per Turn (summary, answer, status) WITHOUT
 * the matched context source. The rail uses it to show every Turn of the
 * session while the transcript window stays truncated.
 * @param events - complete contiguous event log (seq order).
 * @returns every Turn item in turn order plus the log's total turn count.
 */
function buildTurnIndex(events) {
  const entries = projectTurns(events);
  const items = [];
  for (const entry of entries) {
    if (entry.user.length === 0) continue;
    items.push({ ...turnSearchItem(entry), source: "" });
  }
  return { items, total: maxTurnOf(entries) };
}

/**
 * Project the complete log into per-Turn search items in turn order.
 * @param events - complete contiguous event log (seq order).
 * @param query - literal search text.
 * @returns matched items plus the log's total turn count.
 */
function buildTurnSearchIndex(events, query) {
  const normalizedQuery = normalizeSearchTextLocal(query);
  const entries = projectTurns(events);
  const items = [];
  for (const entry of entries) {
    if (entry.user.length === 0) continue;
    const source = [...entry.user, ...entry.assistants].join("\n");
    if (!normalizeSearchTextLocal(source).includes(normalizedQuery)) continue;
    items.push({
      ...turnSearchItem(entry),
      source: searchWindowedSource(source, query),
    });
  }
  return { items, total: maxTurnOf(entries) };
}
//#endregion
//#region src/search-route.ts
/** Bounded in-memory lite-index cache: sessions are re-indexed only when the
 * live event log grows (readSession's replay-validation would otherwise freeze
 * the Host event loop on every rail mount — the "stuck loading" symptom). */
const LITE_CACHE_MAX = 32;
const liteIndexCache = new Map();
function liveSessionEvents(session) {
  if (Array.isArray(session?.events)) return session.events;
  if (typeof session?.snapshotEvents !== "function") return undefined;
  const events = session.snapshotEvents();
  return Array.isArray(events) ? events : undefined;
}
function cachedLiteIndex(sessionId, events) {
  const length = events.length;
  const hit = liteIndexCache.get(sessionId);
  if (hit !== void 0 && hit.length === length) return hit.value;
  const value = buildTurnIndex(events);
  if (liteIndexCache.size >= LITE_CACHE_MAX) {
    const oldest = liteIndexCache.keys().next().value;
    liteIndexCache.delete(oldest);
  }
  liteIndexCache.set(sessionId, { length, value });
  return value;
}
/** Serve GET for /codex-timeline/search?sessionId=&q=&limit= or &lite=1. */
function searchRouteHandler(getSessionQuery, getSessions, getPersistence) {
  return async (req, res) => {
    const url = new URL(req.url ?? "/", "http://dsh.internal");
    if (url.pathname !== "/codex-timeline/search") {
      jsonError(
        res,
        404,
        "not-found",
        `unknown codex-timeline route "${url.pathname}"`,
      );
      return;
    }
    const sessionQuery = getSessionQuery();
    const sessions = getSessions();
    const persistence = getPersistence();
    if (sessionQuery === void 0 && sessions === void 0) {
      jsonError(
        res,
        503,
        "search-unavailable",
        "session search is unavailable: this deployment mounts neither a sessions nor a sessionQuery service",
      );
      return;
    }
    const sessionId = url.searchParams.get("sessionId") ?? "";
    const lite = url.searchParams.get("lite") === "1";
    const query = (url.searchParams.get("q") ?? "").trim();
    if (sessionId === "") {
      jsonError(res, 400, "bad-request", "sessionId is required");
      return;
    }
    if (!lite && query === "") {
      jsonError(res, 400, "bad-request", "q must be non-empty");
      return;
    }
    if (query.length > SEARCH_QUERY_MAX) {
      jsonError(
        res,
        400,
        "bad-request",
        `q must be at most ${SEARCH_QUERY_MAX} characters`,
      );
      return;
    }
    let limit = SEARCH_LIMIT_DEFAULT;
    const limitRaw = url.searchParams.get("limit");
    if (limitRaw !== null) {
      limit = Number(limitRaw);
      if (!Number.isInteger(limit) || limit < 1 || limit > SEARCH_LIMIT_MAX) {
        jsonError(
          res,
          400,
          "bad-request",
          `limit must be an integer between 1 and ${SEARCH_LIMIT_MAX}`,
        );
        return;
      }
    }
    try {
      // Fast paths, never the replay validator when avoidable:
      // 1. live session: raw in-memory event array (the session being viewed).
      // 2. persisted raw artifact: parse the JSONL text directly (~50ms for a
      //    20k-event log, no replay, no validation) — this is what keeps the
      //    rail from blocking a session open.
      // 3. sessionQuery.readSession (full replay) is the last resort.
      const live = sessions === void 0 ? void 0 : sessions.get(sessionId);
      let events;
      let resolved = false;
      const liveEvents = liveSessionEvents(live);
      if (liveEvents !== undefined) {
        events = liveEvents;
        resolved = true;
      } else if (persistence !== void 0) {
        const raw = await persistence.readRaw(sessionId);
        if (raw !== void 0 && typeof raw.content === "string") {
          const parsed = [];
          for (const line of raw.content.split("\n")) {
            if (line.trim() === "") continue;
            try {
              parsed.push(JSON.parse(line));
            } catch {
              // A torn final line is omitted, matching the artifact reader.
            }
          }
          events = parsed;
          resolved = true;
        }
      }
      if (!resolved && sessionQuery !== void 0) {
        events = (await sessionQuery.readSession(sessionId)).events;
        resolved = true;
      }
      if (!resolved) {
        jsonError(
          res,
          404,
          "session-not-found",
          `session ${JSON.stringify(sessionId)} was not found`,
        );
        return;
      }
      if (lite) {
        const { items, total } = cachedLiteIndex(sessionId, events);
        // The fixed-size client rail virtualizes this array, so return the
        // complete lightweight index. Truncating here leaves long sessions
        // with unreachable Turns even though only N markers enter the DOM.
        jsonOk(res, { items, total });
        return;
      }
      const { items, total } = buildTurnSearchIndex(events, query);
      jsonOk(res, { items: items.slice(0, limit), total });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/not found|does not exist|unknown session/i.test(message)) {
        jsonError(res, 404, "session-not-found", message);
      } else {
        jsonError(res, 500, "search-failed", message);
      }
    }
  };
}
//#endregion
/** Dispatch the /codex-timeline/* routes to their per-path handlers. */
function timelineRouteHandler(
  getFace,
  getSessionQuery,
  getSessions,
  getPersistence,
) {
  const settings = settingsRouteHandler(getFace);
  const search = searchRouteHandler(
    getSessionQuery,
    getSessions,
    getPersistence,
  );
  return async (req, res) => {
    const pathname = new URL(req.url ?? "/", "http://dsh.internal").pathname;
    if (pathname === "/codex-timeline/settings") return settings(req, res);
    if (pathname === "/codex-timeline/search") return search(req, res);
    jsonError(
      res,
      404,
      "not-found",
      `unknown codex-timeline route "${pathname}"`,
    );
  };
}
//#region src/index.ts
/** Host services this plugin requires. */
const inject = ["webServer"];
function formatStartupError(error) {
  return error instanceof Error ? error.message : String(error);
}
function logStartupFailure(ctx, scope, error) {
  try {
    ctx.logger.error(
      `dsh-codex-timeline: ${scope} disabled after startup failure: ${formatStartupError(error)}`,
    );
  } catch {}
}
function safeHostInject(ctx, services, scope, install) {
  try {
    ctx.inject(services, (injectedCtx) => {
      try {
        install(injectedCtx);
      } catch (error) {
        logStartupFailure(ctx, scope, error);
      }
    });
  } catch (error) {
    logStartupFailure(ctx, scope, error);
  }
}
function safeHostEffect(ctx, scope, install) {
  try {
    ctx.effect(() => {
      try {
        return install();
      } catch (error) {
        logStartupFailure(ctx, scope, error);
        return () => {};
      }
    }, scope);
  } catch (error) {
    logStartupFailure(ctx, scope, error);
  }
}
/**
 * Mount the timeline preferences namespace, its read/write route, and the
 * full-session search route. Search degrades to a 503 when the deployment does
 * not mount a sessionQuery service.
 * @param ctx - Host plugin context.
 */
function apply(ctx) {
  let face;
  safeHostInject(ctx, ["settings"], "timeline settings", (settingsCtx) => {
    const ns = TIMELINE_SETTINGS_NAMESPACE;
    settingsCtx.settings.register(ns, TimelineSettingsSchema);
    const viewOf = () => {
      const descriptor = settingsCtx.settings
        .describe({ redactSecrets: true })
        .find((candidate) => candidate.ns === ns);
      return descriptor === undefined
        ? { value: undefined, revision: undefined }
        : {
            value: publicTimelineSettings(descriptor.value),
            revision: descriptor.revision,
          };
    };
    const descriptor = settingsCtx.settings
      .describe({ redactSecrets: true })
      .find((candidate) => candidate.ns === ns);
    if (
      descriptor?.user !== null &&
      typeof descriptor?.user === "object" &&
      Object.prototype.hasOwnProperty.call(descriptor.user, "landingFlash")
    ) {
      void settingsCtx.settings
        .mutate(ns, [{ op: "unset", path: ["landingFlash"] }])
        .catch((error) =>
          logStartupFailure(ctx, "timeline settings migration", error),
        );
    }
    face = {
      get: viewOf,
      update: async (patch, expectedRevision) => {
        await settingsCtx.settings.update(ns, patch, expectedRevision);
        return viewOf();
      },
    };
  });
  let sessionQueryFace;
  safeHostInject(ctx, ["sessionQuery"], "timeline search", (queryCtx) => {
    sessionQueryFace = queryCtx.sessionQuery;
  });
  let sessionsFace;
  safeHostInject(
    ctx,
    ["sessions"],
    "timeline search live events",
    (sessionsCtx) => {
      sessionsFace = sessionsCtx.sessions;
    },
  );
  let persistenceFace;
  safeHostInject(
    ctx,
    ["sessionPersistence"],
    "timeline search raw artifacts",
    (persistenceCtx) => {
      persistenceFace = persistenceCtx.sessionPersistence;
    },
  );
  safeHostEffect(ctx, "dsh-codex-timeline: /codex-timeline routes", () =>
    ctx.webServer.register({
      kind: "prefix",
      path: "/codex-timeline",
      handler: timelineRouteHandler(
        () => face,
        () => sessionQueryFace,
        () => sessionsFace,
        () => persistenceFace,
      ),
    }),
  );
}
//#endregion
export { apply, inject };
