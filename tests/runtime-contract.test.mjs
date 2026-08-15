import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const client = await readFile(
  new URL("../lib/client.js", import.meta.url),
  "utf8",
);

test("declares an owned single-session navigation slot and registers the feature", () => {
  assert.match(
    client,
    /"conversation\.chat\.navigation": \{\s*kind: "single",\s*scope: "session"/u,
  );
  assert.match(client, /ctx\.slots\.inject\("conversation\.chat\.navigation"/u);
});

test("uses observer-backed geometry and cleans up scheduled work", () => {
  assert.match(client, /new IntersectionObserver/u);
  assert.match(client, /new ResizeObserver/u);
  assert.match(client, /cancelAnimationFrame/u);
  assert.doesNotMatch(client, /MutationObserver/u);
});

test("keeps paging, keyboard, reduced-motion, search, and settings contracts", () => {
  for (const value of [
    "loadOlderAnchored",
    'event.key === "ArrowUp"',
    'event.key === "Enter"',
    'event.key === " "',
    "prefers-reduced-motion:reduce",
    "timeline.search.noneEarlier",
    "settings.followHighlight",
    "items.length < 3 && !hasMore",
  ]) {
    assert.ok(client.includes(value), value);
  }
});
