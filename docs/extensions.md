# Writing extensions

An extension has up to two halves. Ship them as separate entry points of one package so a server importing the render half
never loads Lexical or React:

```
my-extension/
  src/shared.ts     node type name + serialized shape (no dependencies)
  src/render.ts     → my-extension/render   (server, edge, browser)
  src/editor.tsx    → my-extension/editor   (browser)
  src/styles.css    → my-extension/styles.css
```

`packages/ext-callout` is a complete, tested example. Its `package.json` `exports` map and `tsup.config.ts` are the template.

## 1. Pick a node type and describe its JSON

```ts
// shared.ts: dependency-free
export const NODE_TYPE = "callout";
export interface SerializedCallout { type: "callout"; version: 1; kind: "info" | "tip" | "warning" | "danger"; children: unknown[] }
```

The JSON shape is the contract between halves. `tests/oracle/callout.test.ts` shows how to verify that nodes written by the
editor half render correctly through the render half.

## 2. Render half

```ts
import { defineRenderExtension, h } from "@scottjgilbert/lexical-blog-editor";

export const calloutRender = defineRenderExtension({
  name: "my-extension",
  nodes: { callout: (node, ctx) => h("aside", { class: "Callout" }, ctx.renderChildren(node)) },
});
```

`ctx` gives you `renderChildren(node)`, `renderNode(node)`, `renderState(nested)` (for nested editors such as captions),
`theme`, `ancestors`, `warn()` and `options`. Return `null` to render nothing. Validate everything you read from `node`: it is
untrusted JSON (the callout normalizes `kind` so a hostile value can't inject a class). The output is sanitized afterwards, but
validating keeps your own markup correct.

Extras: `theme` adds class-name keys, `sanitize` widens the policy (e.g. an iframe host), `dependencies` pulls in other render
extensions.

## 3. Editor half

```tsx
import type { EditorExtension } from "@scottjgilbert/lexical-blog-editor/editor"; // type-only: no runtime coupling

export const calloutEditor = {
  name: "my-extension",
  nodes: [CalloutNode],
  plugins: [CalloutPlugin],        // registers commands/transforms with useLexicalComposerContext()
  slashMenu: [{ title: "Callout", keywords: ["note"], onSelect: ({ editor }) => editor.dispatchCommand(INSERT, {}) }],
  insertMenu: [{ title: "Callout", onSelect: ({ editor }) => editor.dispatchCommand(INSERT, {}) }],
} satisfies EditorExtension;
```

Use `import type` for editor types so the extension package has no runtime dependency on the host's editor bundle.

Plain Lexical extensions need no wrapper: pass them as `lexicalExtensions` on `<Editor>` or via the `lexicalExtensions`
field of an editor extension.

## 4. Use it

```tsx
<Editor extensions={[calloutEditor]} … />
<Viewer state={json} extensions={[calloutRender]} />
renderToHtml(json, { extensions: [calloutRender] });
```

Downstream users override anything by listing their own extension *after* yours (same `name` wins, later wins).

## Packaging checklist

- `exports`: `.` (shared), `./render`, `./editor`, `./styles.css`, each with `import` and `require` conditions.
- peers: `@scottjgilbert/lexical-blog-editor`, `lexical`, `@lexical/*`, `react` (mark editor-only ones optional).
- Build the editor entry with a `"use client"` banner and without rollup tree-shaking (it would drop the banner).
- Test the render half with `renderToHtml` and the editor half with a headless editor (see `tests/oracle/callout.test.ts`); add
  a Playwright test that inserts your block from the slash menu and checks every viewer.

## Sketch: an AI-autocomplete extension (not implemented)

Nothing in core needs to change to add this later:

- **Editor half only** (it adds no node type, so no render half): `plugins: [AutocompletePlugin]`, a React component that
  listens to text updates, calls a user-supplied `suggest(context): Promise<string>` prop/option, shows ghost text with a
  decorator or a transient `TextNode`, and accepts it on `Tab` through `KEY_TAB_COMMAND`. Options (endpoint, debounce,
  `AbortSignal` handling) live in a `createAutocompleteExtension(options)` factory that returns an `EditorExtension`.
- If suggestions should be persisted as a distinct node (e.g. AI-attributed text), add a node plus a render half exactly as
  the callout does.
- Publish as `@scottjgilbert/lexical-blog-editor-ext-ai-autocomplete` in `packages/ext-ai-autocomplete`; no server-side code
  ships to viewers.
