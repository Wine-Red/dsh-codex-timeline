import type { Context } from "@deepseek-ai/cordis";

export declare const name = "codex-timeline-invariant";
export declare const inject: readonly ["invariants"];
export declare function apply(ctx: Context): Promise<() => void>;
