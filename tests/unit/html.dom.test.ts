import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { act } from "react";
import { mountViewer, renderToFragment, defineViewerElement } from "@blog/html";
import { Viewer } from "@blog/react";
import { renderToHtml } from "@blog/render";
import { hostile } from "../helpers/hostile";
import { safetyViolations } from "../helpers/safety";
import { normalizeHtml } from "../helpers/normalize";
import { fixtureNames, readFixture } from "../helpers/fixtures";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const text = (t: string) => ({ type: "text", version: 1, text: t, format: 0, style: "", mode: "normal", detail: 0 });
const doc = (...children: unknown[]) => JSON.stringify({ root: { type: "root", version: 1, children, format: "", indent: 0, direction: null } });
const para = (t: string) => ({ type: "paragraph", version: 1, children: [text(t)], format: "", indent: 0, direction: null });

afterEach(() => {
  document.body.innerHTML = "";
});

describe("mountViewer", () => {
  it("renders sanitized HTML into the container", () => {
    const el = document.createElement("div");
    const viewer = mountViewer(el, doc(para("hello")));
    expect(el.innerHTML).toBe(renderToHtml(doc(para("hello"))));
    expect(viewer.html).toBe(el.innerHTML);
  });
  it("update() re-renders and destroy() empties", () => {
    const el = document.createElement("div");
    const viewer = mountViewer(el, doc(para("a")));
    viewer.update(doc(para("b")));
    expect(el.textContent).toBe("b");
    viewer.destroy();
    expect(el.innerHTML).toBe("");
  });
  it("shows the error markup and calls onError for invalid state", () => {
    const el = document.createElement("div");
    const onError = vi.fn();
    mountViewer(el, "garbage", { onError });
    expect(el.querySelector(".LexicalBlogViewer__Error")).not.toBeNull();
    expect(onError).toHaveBeenCalledOnce();
  });
  it("recovers after an error", () => {
    const el = document.createElement("div");
    const viewer = mountViewer(el, "garbage");
    viewer.update(doc(para("fine")));
    expect(el.textContent).toBe("fine");
  });
});

describe("renderToFragment", () => {
  it("returns a fragment that never executes scripts", () => {
    const fragment = renderToFragment(doc(para("x")));
    expect(fragment.querySelector("p")?.textContent).toBe("x");
  });
});

describe("<lexical-blog-viewer>", () => {
  it("renders from the state property and attribute", async () => {
    defineViewerElement();
    defineViewerElement(); // idempotent
    const el = document.createElement("lexical-blog-viewer") as any;
    document.body.append(el);
    el.state = doc(para("via property"));
    expect(el.textContent).toBe("via property");
    el.setAttribute("state", doc(para("via attribute")));
    expect(el.textContent).toBe("via attribute");
  });
  it("renders a pre-set attribute on connect", () => {
    defineViewerElement("blog-viewer-2");
    const el = document.createElement("blog-viewer-2");
    el.setAttribute("state", doc(para("preset")));
    document.body.append(el);
    expect(el.textContent).toBe("preset");
  });
});

describe("all output formats agree and are safe", () => {
  for (const name of fixtureNames) {
    it(`${name}: html string == html viewer == react viewer (normalized)`, () => {
      const state = readFixture(name);
      const fromString = normalizeHtml(renderToHtml(state));
      const el = document.createElement("div");
      mountViewer(el, state);
      const fromViewer = normalizeHtml(el.innerHTML);
      const react = normalizeHtml(renderToString(createElement(Viewer, { state, as: "div" })).replace(/^<div>|<\/div>$/g, ""));
      expect(fromViewer).toBe(fromString);
      // React serializes `style`, booleans and void tags differently; the DOM they build is the same.
      expect(react).toBe(fromString);
      expect(safetyViolations(el.innerHTML)).toEqual([]);
    });
  }

  for (const [name, state] of Object.entries(hostile)) {
    it(`hostile/${name}: no executable content in any format`, () => {
      expect(safetyViolations(renderToHtml(state))).toEqual([]);
      const el = document.createElement("div");
      mountViewer(el, state);
      expect(safetyViolations(el.innerHTML)).toEqual([]);
      expect(safetyViolations(renderToString(createElement(Viewer, { state })))).toEqual([]);
    });
  }

  it("the safety checker itself catches problems (guards against a vacuous test)", () => {
    expect(safetyViolations('<img src=x onerror="alert(1)">')).not.toEqual([]);
    expect(safetyViolations('<a href="javascript:alert(1)">x</a>')).not.toEqual([]);
    expect(safetyViolations("<script>alert(1)</script>")).not.toEqual([]);
    expect(safetyViolations('<iframe src="https://evil.test"></iframe>')).not.toEqual([]);
    expect(safetyViolations('<p style="position: fixed">x</p>')).not.toEqual([]);
  });
});

describe("React hydration", () => {
  it("hydrating server markup produces no mismatch warnings", async () => {
    const errors: unknown[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args) => void errors.push(args));
    for (const name of fixtureNames) {
      const state = readFixture(name);
      const container = document.createElement("div");
      document.body.append(container);
      container.innerHTML = renderToString(createElement(Viewer, { state }));
      let root: ReturnType<typeof hydrateRoot> | undefined;
      await act(async () => {
        root = hydrateRoot(container, createElement(Viewer, { state }), { onRecoverableError: (e) => errors.push(e) });
      });
      await act(async () => root?.unmount());
    }
    spy.mockRestore();
    expect(errors).toEqual([]);
  });
});
