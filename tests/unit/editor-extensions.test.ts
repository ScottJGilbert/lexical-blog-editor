import { describe, expect, it } from "vitest";
import { defineEditorExtension, resolveEditorExtensions } from "@blog/editor-extensions";

class NodeA {}
class NodeB {}
const P1 = () => null;
const P2 = () => null;

describe("resolveEditorExtensions", () => {
  it("returns empty structures for no extensions", () => {
    const r = resolveEditorExtensions();
    expect(r).toMatchObject({ names: [], nodes: [], plugins: [], slashMenu: [], insertMenu: [], lexicalExtensions: [] });
  });
  it("merges nodes, plugins and menu items from all extensions", () => {
    const a = defineEditorExtension({ name: "a", nodes: [NodeA as any], plugins: [P1], slashMenu: [{ title: "A", onSelect() {} }] });
    const b = defineEditorExtension({ name: "b", nodes: [NodeB as any], plugins: [P2], insertMenu: [{ title: "B", onSelect() {} }] });
    const r = resolveEditorExtensions([a, b]);
    expect(r.names).toEqual(["a", "b"]);
    expect(r.nodes).toEqual([NodeA, NodeB]);
    expect(r.plugins).toEqual([P1, P2]);
    expect(r.slashMenu.map((i) => i.title)).toEqual(["A"]);
    expect(r.insertMenu.map((i) => i.title)).toEqual(["B"]);
  });
  it("installs dependencies first and de-duplicates nodes", () => {
    const base = defineEditorExtension({ name: "base", nodes: [NodeA as any] });
    const top = defineEditorExtension({ name: "top", dependencies: [base], nodes: [NodeA as any, NodeB as any] });
    const r = resolveEditorExtensions([top]);
    expect(r.names).toEqual(["base", "top"]);
    expect(r.nodes).toEqual([NodeA, NodeB]);
  });
  it("same name: the last registration wins (downstream override)", () => {
    const one = defineEditorExtension({ name: "x", slashMenu: [{ title: "one", onSelect() {} }] });
    const two = defineEditorExtension({ name: "x", slashMenu: [{ title: "two", onSelect() {} }] });
    expect(resolveEditorExtensions([one, two]).slashMenu.map((i) => i.title)).toEqual(["two"]);
  });
  it("tolerates dependency cycles", () => {
    const a: any = { name: "a", dependencies: [] };
    const b: any = { name: "b", dependencies: [a] };
    a.dependencies.push(b);
    expect(() => resolveEditorExtensions([a])).not.toThrow();
  });
  it("deep-merges themes and merges html import/export", () => {
    const exportA = (() => ({ element: null })) as any;
    const a = defineEditorExtension({ name: "a", theme: { text: { bold: "b1" }, paragraph: "p1" }, html: { export: new Map([[NodeA as any, exportA]]), import: { div: () => null } } });
    const b = defineEditorExtension({ name: "b", theme: { text: { italic: "i2" } }, html: { import: { span: () => null } } });
    const r = resolveEditorExtensions([a, b]);
    expect(r.theme).toEqual({ text: { bold: "b1", italic: "i2" }, paragraph: "p1" });
    expect([...(r.html.export ?? []).keys()]).toEqual([NodeA]);
    expect(Object.keys(r.html.import ?? {}).sort()).toEqual(["div", "span"]);
  });
  it("collects raw Lexical extensions", () => {
    const lexicalExt = { name: "lexical-ext" } as any;
    const r = resolveEditorExtensions([defineEditorExtension({ name: "a", lexicalExtensions: [lexicalExt] })]);
    expect(r.lexicalExtensions).toEqual([lexicalExt]);
  });
});
