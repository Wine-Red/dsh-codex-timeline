import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientPath = path.join(root, "lib", "client.js");
const invariantPath = path.join(root, "lib", "invariant.js");

const upstreamName = "@deepseek-ai/dsh-client-ui-conversation";
const packageName = "dsh-codex-timeline";
const localBuildRoot =
  "E:\\Program\\DSH_plugin\\dsh-codex-timeline\\packages\\";

let client = await readFile(clientPath, "utf8");
client = client
  .replaceAll(upstreamName, packageName)
  .replaceAll(localBuildRoot, "packages\\")
  .replace(/\r?\n\/\/# sourceMappingURL=client\.js\.map\s*$/u, "\n");
client = `${client.trimEnd()}\n`;
await writeFile(clientPath, client, "utf8");

let invariant = await readFile(invariantPath, "utf8");
invariant = invariant
  .replaceAll(upstreamName, packageName)
  .replaceAll("client-ui-conversation-invariant", "codex-timeline-invariant");
await writeFile(invariantPath, invariant, "utf8");
