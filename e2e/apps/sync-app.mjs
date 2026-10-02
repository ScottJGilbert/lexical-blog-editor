// Copies the source of one Next.js e2e app into another so the same routes are
// exercised under a different Next.js major without duplicating them in git.
//   node sync-app.mjs <from> <to>
import { cpSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [from, to] = process.argv.slice(2);
if (!from || !to) throw new Error("usage: sync-app.mjs <from> <to>");
rmSync(join(here, to, "app"), { recursive: true, force: true });
cpSync(join(here, from, "app"), join(here, to, "app"), { recursive: true });
