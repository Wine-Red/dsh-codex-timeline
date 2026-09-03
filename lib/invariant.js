const PACKAGE_NAME = "dsh-codex-timeline";
/** Cordis companion plugin name. */
const name = "codex-timeline-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
 * No runtime invariant: this package contributes through public slots and does
 * not reserve or replace an official Conversation renderer.
 */
const install = () => {};
/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
const apply = (ctx) =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
export { apply, inject, name };
