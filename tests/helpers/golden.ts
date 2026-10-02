import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURE_DIR } from "./fixtures";

const GOLDEN_DIR = join(FIXTURE_DIR, "golden");

export const goldenFor = (name: string, ext: string) =>
  readFileSync(join(GOLDEN_DIR, `${name}.${ext}`), "utf8");

export const writeGolden = (name: string, ext: string, content: string) =>
  writeFileSync(join(GOLDEN_DIR, `${name}.${ext}`), content);

const HOSTILE = join(GOLDEN_DIR, "hostile.json");
export const readHostileGolden = () => JSON.parse(readFileSync(HOSTILE, "utf8"));
export const writeHostileGolden = (value: unknown) =>
  writeFileSync(HOSTILE, JSON.stringify(value, null, 2) + "\n");
