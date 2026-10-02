/**
 * The DOM-free renderer must produce the same document as Lexical's own
 * exportDOM pipeline running on the real editor nodes. Only the deviations
 * listed in IGNORE (deliberate improvements) are allowed to differ.
 */
process.env.TZ = "UTC";
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToHtml } from "@blog/render";
import { oracleHtml } from "../helpers/oracle";
import { normalizeHtml } from "../helpers/normalize";

const dir = join(__dirname, "..", "fixtures");
const names = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));

// Fixtures whose output intentionally differs from v1 (see docs/migration).
const SKIP = new Set(["equation", "embeds"]);

/**
 * Deliberate deviations from Lexical's raw exportDOM output:
 *  - `loading`/`decoding` on images, `spellcheck` on inline code: additions
 *  - `open` on <details>: v1 wrote open="false" for closed sections (always open)
 *  - `rel` on links: the renderer adds noopener/noreferrer to target=_blank
 *  - `tabindex`/`aria-readonly`/`__lexicallisttype`: editor focus plumbing vs a11y
 *  - `cursor` style: editor-only
 *  - data-lexical-datetime: the oracle uses the machine time zone
 *  - image width/height "inherit": not a valid attribute value
 *  - theme classes inside figcaption / on the layout container: the oracle's
 *    nested caption editor has no theme and exportDOM skips container classes
 */
const IGNORE = {
  attrs: [
    "loading", "decoding", "spellcheck", "open", "data-lexical-datetime",
    "rel", "tabindex", "aria-readonly", "__lexicallisttype",
  ],
  styleProps: ["cursor"],
  fixup(root: ParentNode) {
    root.querySelectorAll("img").forEach((img) => {
      for (const a of ["width", "height"]) if (img.getAttribute(a) === "inherit") img.removeAttribute(a);
    });
    root.querySelectorAll("figcaption *, [data-lexical-layout-container]").forEach((el) => el.removeAttribute("class"));
  },
};

describe("renderer vs Lexical exportDOM", () => {
  for (const name of names) {
    (SKIP.has(name) ? it.skip : it)(name, () => {
      const state = readFileSync(join(dir, `${name}.json`), "utf8");
      const expected = normalizeHtml(oracleHtml(state), IGNORE);
      const actual = normalizeHtml(renderToHtml(state), IGNORE);
      expect(actual).toBe(expected);
    });
  }
});
