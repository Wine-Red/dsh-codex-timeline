import {
  SettingsConflictError,
  settingsNamespace,
} from "@deepseek-ai/dsh-settings";
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
  autoLoadAll: z.boolean().default(false),
  favorites: z.array(z.string()).default([]),
  leftOffset: z.number().step(1).min(0).max(120).default(0),
  centerOffset: z.number().step(1).min(-200).max(200).default(0),
  markerSpacing: z.number().step(1).min(6).max(40).default(10),
});
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
 * Mount only the timeline preferences namespace and its read/write route.
 * @param ctx - Host plugin context.
 */
function apply(ctx) {
  let face;
  safeHostInject(ctx, ["settings"], "timeline settings", (settingsCtx) => {
    const ns = settingsNamespace(TIMELINE_SETTINGS_NAMESPACE);
    settingsCtx.settings.register(ns, TimelineSettingsSchema);
    const viewOf = () => {
      const descriptor = settingsCtx.settings
        .describe({ redactSecrets: true })
        .find((candidate) => candidate.ns === ns);
      return descriptor === undefined
        ? { value: undefined, revision: undefined }
        : { value: descriptor.value, revision: descriptor.revision };
    };
    face = {
      get: viewOf,
      update: async (patch, expectedRevision) => {
        await settingsCtx.settings.update(ns, patch, expectedRevision);
        return viewOf();
      },
    };
  });
  safeHostEffect(
    ctx,
    "dsh-codex-timeline: /codex-timeline settings route",
    () =>
      ctx.webServer.register({
        kind: "prefix",
        path: "/codex-timeline",
        handler: settingsRouteHandler(() => face),
      }),
  );
}
//#endregion
export { apply, inject };
