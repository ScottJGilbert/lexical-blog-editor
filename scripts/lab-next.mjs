// Runs the Next.js specs against every lab target, one at a time (each needs its
// own build and server), and prints a summary.
//   node scripts/lab-next.mjs                 # all targets
//   node scripts/lab-next.mjs next16-turbopack next15-turbopack-dev
import { spawnSync } from "node:child_process";

// Next.js rewrites these tracked files when it builds with another distDir.
const generated = ["e2e/apps/next-app/tsconfig.json", "e2e/apps/next-app/next-env.d.ts", "e2e/apps/next16-app/tsconfig.json", "e2e/apps/next-cloudflare/tsconfig.json"];
const restoreGenerated = () => generated.forEach((file) => spawnSync("git", ["checkout", "--", file], { stdio: "ignore" }));

const all = ["next15-turbopack", "next15-turbopack-dev", "next16-turbopack", "next16-turbopack-dev", "next16-webpack", "next16-workerd", "next16-workerd-lean"];
const requested = process.argv.slice(2);
const targets = requested.length ? requested : all;

const results = [];
for (const target of targets) {
  console.log(`\n=== ${target} ===`);
  const started = Date.now();
  const run = spawnSync("pnpm", ["exec", "playwright", "test", "-c", "playwright.lab.config.ts"], {
    stdio: "inherit",
    env: { ...process.env, LAB_TARGET: target },
  });
  restoreGenerated();
  results.push({ target, ok: run.status === 0, seconds: Math.round((Date.now() - started) / 1000) });
}

console.log("\nLab summary");
for (const r of results) console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.target}  (${r.seconds}s)`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
