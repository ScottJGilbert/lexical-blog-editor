// Measures the deployable worker the way `wrangler deploy` would upload it and
// writes .open-next/size.json for the e2e spec to assert on.
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const run = spawnSync(
  process.execPath,
  [join(here, "../../../node_modules/wrangler/bin/wrangler.js"), "deploy", "--dry-run", "--outdir", join(here, ".wrangler-dry-run")],
  { cwd: here, encoding: "utf8", env: { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "1", NO_COLOR: "1", FORCE_COLOR: "0" } },
);
// wrangler logs to either stream depending on the environment, and may colorize.
const out = `${run.stdout}\n${run.stderr}`.replace(/\u001b\[[0-9;]*m/g, "");
const match = /Total Upload: ([\d.]+) KiB \/ gzip: ([\d.]+) KiB/.exec(out);
if (!match) throw new Error(`Could not read the upload size from wrangler:\n${out}`);
const size = { variant: process.env.LAB_VARIANT ?? "naive", rawKiB: Number(match[1]), gzipKiB: Number(match[2]) };
writeFileSync(join(here, ".open-next", "size.json"), JSON.stringify(size, null, 2));
console.log(`worker upload: ${size.rawKiB} KiB raw, ${size.gzipKiB} KiB gzip (${size.variant})`);
