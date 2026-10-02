#!/usr/bin/env node
/**
 * Enforces the layering of packages/lexical-blog-editor/src:
 *
 *   core    -> nothing (no packages, no other layer)
 *   render  -> core                      (+ katex, only in render/katex.ts)
 *   react   -> core, render, react
 *   html    -> core, render
 *   editor  -> anything
 *
 * and that the environment-agnostic layers (core, render) never touch browser
 * globals. Run in CI: `pnpm check:boundaries`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, dirname, resolve } from "node:path";

const SRC = resolve("packages/lexical-blog-editor/src");

const RULES = {
  core: { layers: ["core"], packages: [] },
  render: { layers: ["core", "render"], packages: [], fileExceptions: { "render/katex.ts": ["katex"] } },
  react: { layers: ["core", "render", "react"], packages: ["react", "react/jsx-runtime"] },
  html: { layers: ["core", "render", "html"], packages: [] },
  editor: { layers: ["core", "render", "react", "html", "editor"], packages: null },
};

const DOM_GLOBALS = /\b(window\.|document\.|DOMParser|HTMLElement|navigator\.|localStorage|sessionStorage|requestAnimationFrame|new Document\b)/;
const STRICT_ENV_LAYERS = new Set(["core", "render"]);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) yield p;
  }
}

const IMPORT_RE = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*?\sfrom\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

const problems = [];
for (const layer of Object.keys(RULES)) {
  const rule = RULES[layer];
  const layerDir = join(SRC, layer);
  for (const file of walk(layerDir)) {
    const rel = relative(SRC, file);
    const source = readFileSync(file, "utf8");
    const codeOnly = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    for (const m of codeOnly.matchAll(IMPORT_RE)) {
      const spec = m[1] ?? m[2];
      if (spec.startsWith(".")) {
        const target = resolve(dirname(file), spec);
        const targetRel = relative(SRC, target);
        const targetLayer = targetRel.split("/")[0];
        if (!rule.layers.includes(targetLayer)) {
          problems.push(`${rel}: layer "${layer}" must not import from "${targetLayer}" (${spec})`);
        }
      } else if (rule.packages !== null) {
        const allowed = [...rule.packages, ...(rule.fileExceptions?.[rel] ?? [])];
        if (!allowed.includes(spec)) {
          problems.push(`${rel}: layer "${layer}" must not import package "${spec}"`);
        }
      }
    }
    if (STRICT_ENV_LAYERS.has(layer)) {
      codeOnly.split("\n").forEach((line, i) => {
        if (DOM_GLOBALS.test(line)) problems.push(`${rel}:${i + 1}: browser global in environment-agnostic layer: ${line.trim()}`);
      });
    }
  }
}

if (problems.length) {
  console.error("Layer boundary violations:\n" + problems.map((p) => "  - " + p).join("\n"));
  process.exit(1);
}
console.log("Layer boundaries OK");
