import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientPath = path.join(root, "lib", "client.js");
const invariantPath = path.join(root, "lib", "invariant.js");

for (const target of [clientPath, invariantPath]) {
  const source = await readFile(target, "utf8");
  await writeFile(target, `${source.trimEnd()}\n`, "utf8");
}
