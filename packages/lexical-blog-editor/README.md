# @scottjgilbert/lexical-blog-editor

<p float="left">
<img alt="NPM version" src="https://img.shields.io/npm/v/@scottjgilbert/lexical-blog-editor.svg?style=for-the-badge&labelColor=000000">
<img alt="License" src="https://img.shields.io/npm/l/@scottjgilbert/lexical-blog-editor.svg?style=for-the-badge&labelColor=000000">
</p>

A full suite of rich-text tools built on [Lexical](https://lexical.dev/): a React **editor**, a React **viewer**, a
framework-free **HTML viewer** and a DOM-free **headless renderer** for servers and edge runtimes, all driven by the same
saved JSON, all sanitized by default, all extensible.

> **v2** is a restructure into independently importable pieces. Coming from v1? See [Migrating from v1](#migrating-from-v1).

## Pick the pieces you need

Every component lives behind its own import path, so a server never loads the editor and a blog page never loads Lexical.

| Import path | What it is | Runs in | Needs |
| --- | --- | --- | --- |
| `@scottjgilbert/lexical-blog-editor/editor` | React editor, upload API, editor-extension API | browser (SSR-safe wrapper) | `react`, `react-dom`, `lexical` |
| `…/editor/styles.css` | Editor stylesheet | browser | – |
| `…/react` | `<Viewer>`: saved JSON → React elements | server, RSC, edge, browser | `react` |
| `…/html` | `mountViewer()`, `<lexical-blog-viewer>`: saved JSON → HTML | browser (import-safe anywhere) | – |
| `…/render` | `renderToHtml()`: saved JSON → HTML string | **Node, Express, serverless, edge, browser** | – |
| `…/render/katex` | Optional KaTeX typesetting for equations | same as `/render` | `katex` |
| `…` (root) | Types, sanitizer, render-extension API (no runtime deps) | everywhere | – |
| `…/styles/ViewerTheme.css`, `…/styles/ViewerThemeComplete.css` | Viewer styles | browser | – |

`/render`, `/react`, `/html` and the root import **never** pull in Lexical, a DOM implementation, DOMPurify or the editor.
This is enforced by a boundary check and bundle-size tests in CI.

## Installation

```bash
npm install @scottjgilbert/lexical-blog-editor
```

Only install the peers for the pieces you use:

| You use | Install |
| --- | --- |
| `/render`, `/html`, root | nothing else |
| `/react` | `react` (18 or 19) |
| `/editor` | `react`, `react-dom`, `lexical@^0.40` |

Everything ships as dual ESM + CommonJS with types.

## Quick start

### 1. Edit

```tsx
import { Editor } from "@scottjgilbert/lexical-blog-editor/editor";
import "@scottjgilbert/lexical-blog-editor/editor/styles.css";

export function Composer({ onSave }: { onSave: (json: string) => void }) {
  return (
    <Editor
      placeholder="Start writing…"
      onChange={(state) => onSave(JSON.stringify(state.toJSON()))}
    />
  );
}
```

`initialState` accepts a saved JSON string or an `EditorState`.

### 2. View it in React (works as a Server Component)

```tsx
import { Viewer } from "@scottjgilbert/lexical-blog-editor/react";
import "@scottjgilbert/lexical-blog-editor/styles/ViewerTheme.css";

export default function Post({ json }: { json: string }) {
  return <Viewer state={json} />;
}
```

`<Viewer>` uses no hooks and no browser APIs: render it in a React Server Component and it ships **zero** client JS.

### 3. View it without React

```ts
import { mountViewer } from "@scottjgilbert/lexical-blog-editor/html";

const viewer = mountViewer(document.querySelector("#post")!, json);
viewer.update(newJson); // re-render
```

Or as a custom element:

```ts
import { defineViewerElement } from "@scottjgilbert/lexical-blog-editor/html";
defineViewerElement(); // <lexical-blog-viewer state='{"root":…}'></lexical-blog-viewer>
```

### 4. Render on a server (Express, serverless, edge)

```ts
import express from "express";
import { renderToHtml } from "@scottjgilbert/lexical-blog-editor/render";

const app = express();
app.get("/posts/:id", async (req, res) => {
  const json = await db.posts.getJson(req.params.id);
  res.send(`<article>${renderToHtml(json)}</article>`);
});
```

The same call works unchanged in Next.js route handlers, Cloudflare Workers, Vercel Edge, Deno Deploy and the browser:
no `window`, no `document`, no jsdom, no Node built-ins.

```ts
// Web-standard handler (Workers / Edge / Deno)
export default {
  async fetch(request: Request) {
    const { state } = await request.json();
    return new Response(renderToHtml(state), { headers: { "content-type": "text/html" } });
  },
};
```

> **Same input, same output, everywhere.** The saved JSON renders to byte-identical HTML in Node, jsdom, the edge
> runtime and the browser, and the React and HTML viewers build the same DOM. A shared fixture corpus asserts this in CI
> (see [Testing](#testing)).

## Renderer options

Every renderer (`renderToHtml`, `renderToTree`, `createRenderer`, `<Viewer>`, `mountViewer`) takes the same options:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `sanitize` | `boolean` | `true` | Strip anything unsafe. Disable only for content you fully trust. |
| `sanitizePolicy` | `SanitizePolicy` | – | Extend the allowlists: tags, attributes, URL schemes, iframe hosts, CSS properties. |
| `theme` | `RenderTheme` | viewer theme | Class names, deep-merged over the defaults (matches `ViewerTheme.css`). |
| `extensions` | `RenderExtension[]` | `[]` | Custom node renderers, theme and policy additions. See [Extensions](#extensions). |
| `limits` | `{ maxDepth?, maxNodes? }` | `256` / `200 000` | Protection against hostile input. Exceeding throws `RenderLimitError`. |
| `onWarning` | `(message, node?) => void` | no-op | Called for unknown nodes and renderer failures. |
| `formatDateTime` | `(date: Date) => string` | UTC `Tue Mar 05 2024 12:30` | Text for date nodes. The default ignores the machine's time zone so output is deterministic. |

For many documents, build a renderer once:

```ts
import { createRenderer } from "@scottjgilbert/lexical-blog-editor/render";
const renderer = createRenderer({ theme: { paragraph: "prose-p" } });
renderer.renderToHtml(json);
renderer.renderToTree(json); // the sanitized tree (HNode[])
```

Input can be the saved JSON string, the parsed object, or a Lexical `EditorState`. Invalid input throws
`InvalidEditorStateError`; the viewers catch it and show an error element (`LexicalBlogViewer__Error`).

### `<Viewer>` extras

| Prop | Description |
| --- | --- |
| `renderer` | A prebuilt `createRenderer()` result. |
| `replace(element, { render })` | Swap any element for your own component, e.g. real tweets with `react-tweet`. |
| `className`, `as` | Wrapper class and tag. |
| `fallback`, `onError` | Error UI and reporting. |

```tsx
import { Tweet } from "react-tweet";
<Viewer
  state={json}
  replace={(el) =>
    el.props["data-lexical-tweet-id"] ? <Tweet id={String(el.props["data-lexical-tweet-id"])} /> : undefined
  }
/>;
```

## Sanitization

Sanitization is **on by default in every viewer and the headless renderer**. It works on the intermediate tree before any
HTML string, React element or DOM node exists, so it needs no DOM and cannot be bypassed by parser differentials.

- Only allowlisted tags and attributes survive; `on*` handlers, `<script>`, `<style>`, `<svg>`, forms and unknown tags are dropped.
- URLs (`href`, `src`, `poster`): `http`, `https`, `mailto`, `tel`, relative and `#fragment` only. Whitespace/control-character
  tricks (`java\tscript:`) are normalized away. `data:` is accepted only for raster images in `<img src>`.
- `<iframe>` must match an allowlist (YouTube, Figma, Vimeo, X/Twitter by default) — host boundaries are checked, so
  `youtube.com.evil.test` fails. Extend with `sanitizePolicy.iframeAllowlist`.
- `style` is reduced to an allowlist of CSS properties; `url()`, `expression()`, `var()`, comments and escapes are rejected.
- `target="_blank"` links always get `rel="noopener noreferrer"`.
- `id`/`name` are removed (DOM clobbering); opt back in with `sanitizePolicy.allowAttributes: ["id"]`.
- Text is escaped on output; unknown node types render their children only.

Hostile corpora (javascript: URLs, attribute/class/style/iframe injection, prototype-pollution node types, 3000-deep
documents…) are tested in every environment and output format.

## Editor

```tsx
<Editor
  placeholder="Write…"
  initialState={savedJson}
  onChange={(state) => save(JSON.stringify(state.toJSON()))}
  onUpload={uploadToMyStorage}          // media uploads
  onUploadEvent={(e) => track(e)}       // start / progress / success / error / abort
  extensions={[calloutEditor]}          // blog-editor extensions
  lexicalExtensions={[myLexicalExt]}    // plain Lexical extensions
  onReady={(editor) => (window.editor = editor)}
>
  <MyLexicalPlugin />                   {/* any Lexical React plugin */}
</Editor>
```

| Prop | Type | Description |
| --- | --- | --- |
| `onChange` | `(state: EditorState) => void` | **Required.** Fires on every update. |
| `placeholder` | `string` | Empty-state text. |
| `initialState` | `EditorState \| string` | Saved JSON or state. A short welcome document is used when omitted. |
| `onUpload` | `MediaUploadHandler` | Upload handler (see below). |
| `onUploadEvent` | `(event: UploadEvent) => void` | Lifecycle events for every file. |
| `kinds` | `("image" \| "video" \| "audio" \| "file")[]` | Enabled media kinds (default all). |
| `accept` | `Partial<Record<MediaKind, string[]>>` | Override accepted MIME patterns per kind. |
| `maxFileSize` | `number \| Partial<Record<MediaKind, number>>` | Size limit in bytes. |
| `extensions` | `EditorExtension[]` | Blog-editor extensions. Pass a stable array. |
| `lexicalExtensions` | `AnyLexicalExtensionArgument[]` | Plain Lexical extensions, installed as dependencies. |
| `children` | `ReactNode` | Extra Lexical plugins rendered inside the composer. |
| `onReady` | `(editor: LexicalEditor) => void` | Receives the Lexical editor once. |

The editor needs a browser. `<Editor>` renders a lightweight placeholder on the server and during hydration and mounts the
real editor on the client, so it is safe in Next.js, Remix and other SSR setups.

### Media uploads

Drop, paste, the toolbar and the slash menu all funnel into one pipeline. Provide a handler that stores the file and
returns its URL:

```ts
import type { MediaUploadHandler } from "@scottjgilbert/lexical-blog-editor/editor";

const onUpload: MediaUploadHandler = async (file, { signal, onProgress, kind }) => {
  const body = new FormData();
  body.set("file", file);
  const res = await fetch("/api/upload", { method: "POST", body, signal });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  onProgress(1);
  const { url } = await res.json();
  return url; // or { src: url, width, height, poster, altText, ... }
};
```

While a file uploads, a placeholder with progress and a cancel button sits in the document; on success it is replaced with
an image, video, audio or file-attachment node, on failure it disappears. Placeholders are never rendered by the viewers,
and deleting one cancels its upload (`signal` aborts).

Events (also available through `onUploadEvent`):

```ts
type UploadEvent =
  | { type: "start";    id; file; kind; pending }
  | { type: "progress"; id; file; kind; pending; progress /* 0..1 */ }
  | { type: "success";  id; file; kind; pending; result }
  | { type: "error";    id; file; kind; pending; error; reason /* handler-error | no-handler | too-large | type-not-accepted */ }
  | { type: "abort";    id; file; kind; pending };
```

`pending` is the number of uploads still in flight, handy for disabling a Save button.

Without `onUpload`, images are inlined as data URLs (capped at 5 MB) and other media is rejected with
`reason: "no-handler"`.

Build your own upload UI with the command the built-in UI uses:

```ts
import { UPLOAD_MEDIA_COMMAND } from "@scottjgilbert/lexical-blog-editor/editor";
editor.dispatchCommand(UPLOAD_MEDIA_COMMAND, { files: [file], altText: "A cat" });
```

## Extensions

Extensibility has two independent halves so server bundles never see editor code:

| Half | Import path (by convention) | Runs in | Defines |
| --- | --- | --- | --- |
| **Render** | `my-extension/render` | server, edge, browser | how a node type becomes HTML/JSX |
| **Editor** | `my-extension/editor` | browser | the Lexical node, plugin, menu entries, theme |

Plain Lexical extensions (`defineExtension`, `configExtension`) work as usual through `lexicalExtensions`, and any Lexical
React plugin can be passed as `<Editor>` children. `defineEditorExtension` bundles the pieces specific to this editor.

### Editor half

```tsx
import { defineEditorExtension } from "@scottjgilbert/lexical-blog-editor/editor";

export const myEditor = defineEditorExtension({
  name: "my-extension",
  nodes: [MyNode],                                  // Lexical node classes
  theme: { paragraph: "my-paragraph" },             // deep-merged into the editor theme
  html: { import: {…}, export: new Map() },         // DOM import/export (copy & paste)
  plugins: [MyPlugin],                              // React components inside the composer
  slashMenu: [{ title: "My block", keywords: ["x"], onSelect: ({ editor, showModal }) => … }],
  insertMenu: [{ title: "My block", onSelect: ({ editor }) => … }],
  lexicalExtensions: [somePlainLexicalExtension],   // installed as dependencies
  dependencies: [otherEditorExtension],             // installed first
});
```

### Render half

```ts
import { defineRenderExtension, h } from "@scottjgilbert/lexical-blog-editor";

export const myRender = defineRenderExtension({
  name: "my-extension",
  nodes: {
    callout: (node, ctx) => h("aside", { class: "callout" }, ctx.renderChildren(node)),
  },
  theme: { callout: "callout" },                    // extra class names
  sanitize: { iframeAllowlist: ["https://maps.example.com/embed/"] },
});

renderToHtml(json, { extensions: [myRender] });
<Viewer state={json} extensions={[myRender]} />;
mountViewer(el, json, { extensions: [myRender] });
```

A renderer receives plain JSON and returns `h(tag, props, children)` nodes; its output goes through the same sanitizer as
built-ins, so a buggy or hostile extension cannot emit scripts. Later extensions override earlier ones and the built-ins
(listing your own after a packaged one overrides it). A renderer that throws is isolated to its node and reported via
`onWarning`.

### Distributing an extension

Publish it as its own package next to the core, the way Lexical does with `@lexical/*`. The repository ships a complete
reference, [`@scottjgilbert/lexical-blog-editor-ext-callout`](../ext-callout), with `./render`, `./editor` and `./styles.css`
entry points; copy it as a template. A future AI-autocomplete package would follow the same shape: an editor half
(`plugins` for the suggestion UI, `lexicalExtensions` for key handling) and, if it adds node types, a render half.

## Built-in content

Headings, paragraphs, quotes, lists and checklists, links and auto-links, code blocks (Shiki highlighting is stored in the
JSON, so viewers need no highlighter), tables (merged cells, widths, header cells), images with captions, **video, audio and
file attachments**, YouTube / X (Twitter) / Figma embeds, equations, horizontal rules, collapsible sections, multi-column
layouts, dates, mentions, hashtags, keywords and emojis. Editor features: floating toolbars, markdown shortcuts, slash
menu, drag handle, table tools, speech-to-text, history and more.

Equations render as their LaTeX source until you opt into typesetting:

```ts
import { katexRenderExtension } from "@scottjgilbert/lexical-blog-editor/render/katex";
renderToHtml(json, { extensions: [katexRenderExtension] }); // and include katex/dist/katex.min.css
```

## Styling

See the [styling guide](../../docs/styling.md). All viewers emit the same class names (`ViewerTheme__*`); import
`styles/ViewerTheme.css` (minimal) and optionally `styles/ViewerThemeComplete.css`, or supply your own via `theme`.

## Testing

The repository tests the published artifact, not just the source:

- **Differential tests** render fixtures from real editor nodes with both Lexical's own `exportDOM` and this renderer and
  require identical documents (deliberate deviations are listed in the test).
- **Cross-environment goldens**: one fixture corpus, one golden HTML file per fixture; Node, jsdom and Vercel's
  edge-runtime VM must reproduce it byte-for-byte; React markup, the HTML viewer and hydration must agree.
- **Native Node**: real ESM `import` and CommonJS `require`, Express apps (ESM and CJS) over HTTP, a Web-standard handler in
  the edge VM.
- **Browser e2e (Playwright)**: the editor (typing, shortcuts, slash menu, extensions, uploads by picker/paste/command,
  cancel, failure, limits) and a Next.js app (RSC with JS disabled, SSR + hydration, Node and Edge route handlers).
- **Bundle tests** assert each entry point's dependency footprint and size.

See [`docs/testing.md`](../../docs/testing.md).

## Migrating from v1

| v1 | v2 |
| --- | --- |
| `import { Editor } from "…"` | `import { Editor } from "…/editor"` and **`import "…/editor/styles.css"`** (CSS is no longer injected by the JS). |
| `import { Viewer } from "…/viewer"` | `import { Viewer } from "…/react"`. No jsdom, no global `window` hack on the server. |
| `Viewer` swapped tweets for `react-tweet` | Tweets render as a link; use `replace` to bring `react-tweet` back (above). |
| Equations typeset with KaTeX | Opt in with `render/katex`. |
| DOMPurify + `strip-html` over the HTML/JSON | Allowlist sanitizer over the render tree (JSON content such as code containing `<div>` is no longer mangled). |
| `Viewer` `sanitize` prop | Unchanged (`sanitize={false}` opts out). |
| Figma embeds rendered empty; YouTube embeds were stripped by the allowlist | Both render. |
| Closed collapsibles rendered open | `open` is only emitted when open. |
| Date nodes used the server's local time | Deterministic UTC text (override with `formatDateTime`). |
| Sample-image button in the image dialog | Removed (URL and File remain; File now goes through the upload API). |
| Dependencies: `jsdom`, `dompurify`, `html-react-parser`, `react-tweet`, `@igorskyflyer/strip-html`, `y-websocket` | Removed. |
| CommonJS `require` of the main entry was broken | Dual ESM + CJS for every entry point. |

## Contributing

This repository is a pnpm workspace; see the [root README](../../README.md) and
[`docs/architecture.md`](../../docs/architecture.md).

## Acknowledgments

Built on Meta's [Lexical](https://lexical.dev/). The editor is derived from the Lexical Playground.

## License

MIT
