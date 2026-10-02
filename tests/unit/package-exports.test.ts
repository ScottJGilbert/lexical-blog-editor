import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const pkgDir = join(__dirname, "..", "..", "packages", "lexical-blog-editor");
const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));

function targets(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap(targets);
  return [];
}

describe("package.json exports", () => {
  for (const [subpath, value] of Object.entries(pkg.exports)) {
    it(`${subpath} points at files that exist after a build`, () => {
      for (const target of targets(value)) {
        expect(existsSync(join(pkgDir, target)), `${subpath} -> ${target}`).toBe(true);
      }
    });
  }
});

describe("shipped stylesheets", () => {
  // Regression: dist/styles/*.css once pointed at ../images/icons/plus.svg, which
  // only existed in the source tree, so consumers' bundlers failed to build.
  for (const file of ["styles/ViewerTheme.css", "styles/ViewerThemeComplete.css", "editor/index.css"]) {
    it(`${file}: every relative url() resolves inside dist`, () => {
      const path = join(pkgDir, "dist", file);
      expect(existsSync(path), `${file} missing (run pnpm build)`).toBe(true);
      const css = readFileSync(path, "utf8");
      const urls = [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1]);
      for (const url of urls) {
        if (/^(data:|https?:|#|\/\/)/.test(url)) continue;
        const target = join(pkgDir, "dist", file, "..", url.split(/[?#]/)[0]);
        expect(existsSync(target), `${file} -> ${url}`).toBe(true);
      }
    });
  }
});
