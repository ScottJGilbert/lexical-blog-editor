// Bundles the worker the way `wrangler deploy` does (production mode), once per
// configuration, into dist/<variant>/worker.js. Used by tests/lab/workerd.test.ts.
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const variants = {
  plain: { flags: [], date: "2025-09-01" },
  "nodejs-compat": { flags: ["nodejs_compat"], date: "2025-09-01" },
  "old-date": { flags: [], date: "2023-05-18" },
};

export function bundle(only = Object.keys(variants)) {
  for (const name of only) {
    const { flags, date } = variants[name];
    const outdir = join(here, "dist", name);
    rmSync(outdir, { recursive: true, force: true });
    execFileSync(
      process.execPath,
      [
        join(here, "../../../node_modules/wrangler/bin/wrangler.js"),
        "deploy", "--dry-run", "--outdir", outdir,
        "--compatibility-date", date,
        ...flags.flatMap((f) => ["--compatibility-flags", f]),
      ],
      { cwd: here, stdio: "inherit", // A real deploy ships React's production build; do not inherit NODE_ENV=test from the runner.
      env: { ...process.env, NODE_ENV: "production", WRANGLER_SEND_METRICS: "false", CI: "1", NO_COLOR: "1" } },
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) bundle();
