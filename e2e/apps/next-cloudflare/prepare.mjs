// LAB_VARIANT=lean additionally loads the editor with next/dynamic({ ssr: false }), the
// recommended pattern when the server bundle is size-constrained (see the README).
//
// Generates ./app from ../next-app/app for a runtime with no filesystem and no
// Edge runtime (OpenNext on Cloudflare Workers):
//   - the Edge route is dropped (OpenNext serves everything from one Node-style worker)
//   - the RSC page imports the fixtures instead of reading them from disk
import { cpSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, "app");
rmSync(app, { recursive: true, force: true });
cpSync(join(here, "../next-app/app"), app, { recursive: true });
rmSync(join(app, "api/edge"), { recursive: true, force: true });

const fixtureDir = join(here, "../../../tests/fixtures");
const names = readdirSync(fixtureDir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
mkdirSync(join(app, "_fixtures"), { recursive: true });
writeFileSync(
  join(app, "_fixtures/index.ts"),
  `export const fixtures: Record<string, string> = {\n${names
    .map((n) => `  ${JSON.stringify(n)}: ${JSON.stringify(readFileSync(join(fixtureDir, `${n}.json`), "utf8"))},`)
    .join("\n")}\n};\n`,
);

const page = join(app, "rsc/[name]/page.tsx");
const source = readFileSync(page, "utf8")
  .replace('import { readFileSync } from "node:fs";\nimport { join } from "node:path";\n', 'import { notFound } from "next/navigation";\nimport { fixtures } from "../../_fixtures";\n')
  .replace(/const state = readFileSync\([^;]*;\n/, 'const state = fixtures[name];\n  if (!state) notFound();\n');
writeFileSync(page, source);

if (process.env.LAB_VARIANT === "lean") {
  const dir = join(app, "client");
  renameSync(join(dir, "page.tsx"), join(dir, "ClientEditor.tsx"));
  writeFileSync(
    join(dir, "page.tsx"),
    `"use client";

import dynamic from "next/dynamic";

// The editor (and everything it pulls in: Lexical, shiki, prettier) stays out of the server bundle.
const ClientEditor = dynamic(() => import("./ClientEditor"), {
  ssr: false,
  loading: () => (
    <div className="LexicalBlogEditor__loading" role="status" aria-live="polite">
      <p>Loading editor...</p>
    </div>
  ),
});

export default function ClientPage() {
  return <ClientEditor />;
}
`,
  );
}
