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
