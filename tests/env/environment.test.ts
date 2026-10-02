import { describe, expect, it } from "vitest";

declare const __TEST_ENV__: "node" | "jsdom" | "edge-runtime";

/** Guards against a project silently running in the wrong runtime. */
describe("runtime sanity", () => {
  it(`is really running in ${__TEST_ENV__}`, () => {
    const hasDocument = typeof document !== "undefined";
    const isEdge = typeof (globalThis as any).EdgeRuntime === "string";
    expect(hasDocument).toBe(__TEST_ENV__ === "jsdom");
    expect(isEdge).toBe(__TEST_ENV__ === "edge-runtime");
  });

  it("the renderer does not need window/document", async () => {
    const { renderToHtml } = await import("@scottjgilbert/lexical-blog-editor/render");
    const state = JSON.stringify({
      root: { type: "root", children: [{ type: "paragraph", children: [{ type: "text", text: "hi", format: 0 }] }] },
    });
    expect(renderToHtml(state)).toContain("hi");
  });
});
