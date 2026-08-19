import type { Context } from "@deepseek-ai/cordis";

export declare const inject: readonly string[];
/** Mount the timeline additively without taking ownership of Conversation. */
export declare function apply(ctx: Context): void;
