import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";
//#region ../packages/client/ui-conversation/src/submission-settings.ts
/** Busy-Enter preference stored in the Host user-settings document. */
/** Settings namespace owned by the conversation plugin. */
const CONVERSATION_SETTINGS_NAMESPACE = "ui-conversation";
/** Field carrying the delivery mode for plain Enter while an agent is busy. */
const BUSY_ENTER_FIELD = "busyEnter";
/** Busy-Enter behaviors accepted at settings and input boundaries. */
const BUSY_ENTER_BEHAVIORS = ["queue", "steer"];
/** Default preserves Enter-as-Queue for running conversations. */
const DEFAULT_BUSY_ENTER_BEHAVIOR = "queue";
/** Durable conversation schema; also the wire envelope the browser scope validates against. */
const ConversationSettingsSchema = z.object({
  [BUSY_ENTER_FIELD]: z
    .union([...BUSY_ENTER_BEHAVIORS])
    .default(DEFAULT_BUSY_ENTER_BEHAVIOR),
});
//#endregion
//#region ../packages/client/ui-conversation/src/index.ts
/**
 * Register the durable conversation section when a settings provider exists.
 * @param ctx - Host context whose optional settings service owns the section.
 */
function apply$2(ctx) {
  ctx.inject(["settings"], (settingsCtx) => {
    settingsCtx.settings.register(
      settingsNamespace(CONVERSATION_SETTINGS_NAMESPACE),
      ConversationSettingsSchema,
    );
  });
}
//#endregion
//#region ../packages/client/ui-turn-navigation/src/settings.ts
/** Durable settings shared by the Host schema and browser scope. */
const TURN_NAVIGATION_SETTINGS_NAMESPACE = "ui-turn-navigation";
const TURN_NAVIGATION_DENSITIES = ["all", "sparse"];
const DEFAULT_TURN_NAVIGATION_SETTINGS = Object.freeze({
  enabled: true,
  defaultVisible: true,
  density: "all",
  followHighlight: true,
});
const TurnNavigationSettingsSchema = z.object({
  enabled: z.boolean().default(DEFAULT_TURN_NAVIGATION_SETTINGS.enabled),
  defaultVisible: z
    .boolean()
    .default(DEFAULT_TURN_NAVIGATION_SETTINGS.defaultVisible),
  density: z
    .union([...TURN_NAVIGATION_DENSITIES])
    .default(DEFAULT_TURN_NAVIGATION_SETTINGS.density),
  followHighlight: z
    .boolean()
    .default(DEFAULT_TURN_NAVIGATION_SETTINGS.followHighlight),
});
//#endregion
//#region ../packages/client/ui-turn-navigation/src/index.ts
/** Register the durable settings section when Host settings is composed. */
function apply$1(ctx) {
  ctx.inject(["settings"], (settingsCtx) => {
    settingsCtx.settings.register(
      settingsNamespace(TURN_NAVIGATION_SETTINGS_NAMESPACE),
      TurnNavigationSettingsSchema,
    );
  });
}
//#endregion
//#region src/index.ts
/** Register the original conversation preferences and turn-navigation preferences. */
function apply(ctx) {
  apply$2(ctx);
  apply$1(ctx);
}
//#endregion
export { apply };
