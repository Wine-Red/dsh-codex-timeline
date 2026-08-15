import type { Context } from "@deepseek-ai/cordis";

export declare const inject: readonly string[];
/** Mount the patched rc.6 conversation surface and its turn navigation. */
export declare function apply(ctx: Context): void;
