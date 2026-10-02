import { it } from "vitest";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { oracleHtml } from "../helpers/oracle";
it("dump", () => {
  const dir = join(__dirname, "..", "fixtures");
  mkdirSync("/tmp/claude-0/oracle", { recursive: true });
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    let out: string;
    try { out = oracleHtml(readFileSync(join(dir, f), "utf8")); } catch (e: any) { out = "ERROR " + e.message; }
    writeFileSync(`/tmp/claude-0/oracle/${f.replace(".json", ".html")}`, out);
  }
});
