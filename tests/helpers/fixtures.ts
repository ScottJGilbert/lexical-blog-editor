import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const FIXTURE_DIR = join(__dirname, "..", "fixtures");

export const fixtureNames = readdirSync(FIXTURE_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.slice(0, -5))
  .sort();

export const readFixture = (name: string) =>
  readFileSync(join(FIXTURE_DIR, `${name}.json`), "utf8");

export const readGolden = (name: string) =>
  readFileSync(join(FIXTURE_DIR, `${name}.html`), "utf8");
