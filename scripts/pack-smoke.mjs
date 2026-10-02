#!/usr/bin/env node
/**
 * Consumer smoke test: `pack` every package, install the tarballs into an empty
 * project exactly like an npm user would, then
 *   - import/require every public entry point under real Node resolution, and
 *   - type-check a consumer file under several `moduleResolution` modes.
 * Catches wrong `files`, broken `exports`, missing dependencies and bad types
 * that workspace links hide.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(".");
const work = mkdtempSync(join(tmpdir(), "lbe-pack-"));
const run = (cmd, args, cwd, opts = {}) =>
  execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });

console.log("› packing");
const tarballs = [];
for (const dir of ["packages/lexical-blog-editor", "packages/ext-callout"]) {
  run("pnpm", ["pack", "--pack-destination", work], join(root, dir));
}
for (const f of readdirSync(work)) if (f.endsWith(".tgz")) tarballs.push(join(work, f));
console.log("  ", tarballs.map((t) => t.split("/").pop()).join(", "));

const app = join(work, "consumer");
mkdirSync(app);
writeFileSync(join(app, "package.json"), JSON.stringify({ name: "consumer", private: true, version: "0.0.0" }));
console.log("› installing into a clean project");
run(
  "npm",
  ["install", "--no-audit", "--no-fund", "--legacy-peer-deps", ...tarballs,
   "react@19", "react-dom@19", "lexical@0.40", "@lexical/react@0.40", "@lexical/utils@0.40", "katex", "typescript@5", "@types/react@19", "@types/node@20"],
  app,
  { maxBuffer: 64 * 1024 * 1024 },
);

const ENTRIES = [
  "@scottjgilbert/lexical-blog-editor",
  "@scottjgilbert/lexical-blog-editor/render",
  "@scottjgilbert/lexical-blog-editor/render/katex",
  "@scottjgilbert/lexical-blog-editor/react",
  "@scottjgilbert/lexical-blog-editor/html",
  "@scottjgilbert/lexical-blog-editor/editor",
  "@scottjgilbert/lexical-blog-editor-ext-callout",
  "@scottjgilbert/lexical-blog-editor-ext-callout/render",
  "@scottjgilbert/lexical-blog-editor-ext-callout/editor",
];

console.log("› loading every entry point (ESM import + CJS require)");
writeFileSync(join(app, "esm.mjs"), `
const results = {};
for (const entry of ${JSON.stringify(ENTRIES)}) results[entry] = Object.keys(await import(entry)).length;
const { renderToHtml } = await import("@scottjgilbert/lexical-blog-editor/render");
const html = renderToHtml(JSON.stringify({ root: { type: "root", children: [{ type: "paragraph", children: [{ type: "text", text: "hi", format: 1 }] }] } }));
console.log(JSON.stringify({ results, html }));
`);
writeFileSync(join(app, "cjs.cjs"), `
const results = {};
for (const entry of ${JSON.stringify(ENTRIES.filter((e) => !e.endsWith("/editor")))}) results[entry] = Object.keys(require(entry)).length;
const { renderToHtml } = require("@scottjgilbert/lexical-blog-editor/render");
console.log(JSON.stringify({ results, html: renderToHtml(JSON.stringify({ root: { type: "root", children: [{ type: "paragraph", children: [{ type: "text", text: "hi", format: 1 }] }] } })) }));
`);
const esm = JSON.parse(run("node", ["esm.mjs"], app));
const cjs = JSON.parse(run("node", ["cjs.cjs"], app));
for (const [k, v] of Object.entries({ ...esm.results, ...cjs.results })) if (!v) throw new Error(`${k} has no exports`);
if (esm.html !== cjs.html) throw new Error("ESM and CJS render differently");
console.log("   ok:", Object.keys(esm.results).length, "ESM entries,", Object.keys(cjs.results).length, "CJS entries");

console.log("› type-checking a consumer under each moduleResolution mode");
writeFileSync(join(app, "consumer.ts"), `
import { h, defineRenderExtension, sanitizeTree } from "@scottjgilbert/lexical-blog-editor";
import { renderToHtml, createRenderer } from "@scottjgilbert/lexical-blog-editor/render";
import { katexRenderExtension } from "@scottjgilbert/lexical-blog-editor/render/katex";
import { Viewer } from "@scottjgilbert/lexical-blog-editor/react";
import { mountViewer } from "@scottjgilbert/lexical-blog-editor/html";
import { Editor, defineEditorExtension, type MediaUploadHandler } from "@scottjgilbert/lexical-blog-editor/editor";
import { calloutRender } from "@scottjgilbert/lexical-blog-editor-ext-callout/render";
import { calloutEditor } from "@scottjgilbert/lexical-blog-editor-ext-callout/editor";

const ext = defineRenderExtension({ name: "x", nodes: { x: (n, ctx) => h("div", {}, ctx.renderChildren(n)) } });
const html: string = renderToHtml("{}", { extensions: [ext, katexRenderExtension, calloutRender], theme: { paragraph: "p" } });
const r = createRenderer({ sanitize: true });
void [html, r, sanitizeTree, Viewer, mountViewer, Editor, calloutEditor];
const upload: MediaUploadHandler = async (file, ctx) => { ctx.onProgress(1); return "https://x/" + file.name; };
const mine = defineEditorExtension({ name: "mine", slashMenu: [{ title: "t", onSelect: ({ editor }) => void editor }] });
void [upload, mine];
// @ts-expect-error unknown option must be rejected
renderToHtml("{}", { nope: true });
`);
const modes = [
  { module: "esnext", moduleResolution: "bundler" },
  { module: "node16", moduleResolution: "node16" },
  { module: "commonjs", moduleResolution: "node10" },
];
for (const m of modes) {
  writeFileSync(join(app, `tsconfig.${m.moduleResolution}.json`), JSON.stringify({
    compilerOptions: { ...m, target: "ES2020", strict: true, skipLibCheck: true, noEmit: true, jsx: "react-jsx", types: ["node"], lib: ["dom", "esnext"], esModuleInterop: true },
    files: ["consumer.ts"],
  }));
  try {
    run("npx", ["tsc", "-p", `tsconfig.${m.moduleResolution}.json`], app);
    console.log(`   ok: moduleResolution ${m.moduleResolution}`);
  } catch (e) {
    console.error(String(e.stdout ?? e.message));
    throw new Error(`type-check failed under moduleResolution=${m.moduleResolution}`);
  }
}

const size = run("du", ["-sh", join(app, "node_modules/@scottjgilbert")], app).trim().split("\t")[0];
console.log(`› installed size of @scottjgilbert/*: ${size}`);
rmSync(work, { recursive: true, force: true });
console.log("Pack smoke test passed");
