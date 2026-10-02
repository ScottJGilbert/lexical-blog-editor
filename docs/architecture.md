# Architecture

## The shape of the problem

Saved Lexical JSON has to be displayed in four places (React, plain HTML in a browser, a server, an edge function) and
edited in one. The old design pushed all of them through Lexical's `$generateHtmlFromNodes`, which needs a DOM, so
servers needed jsdom (fragile on serverless) and every viewer bundled editor code.

v2 splits the problem along its natural seam:

```
                        ┌──────────── editor (browser only) ────────────┐
 typing / paste / drop  │ Lexical + plugins + upload API + extensions   │──► saved JSON
                        └───────────────────────────────────────────────┘        │
                                                                                  ▼
 core: types · sanitizer · theme · render-extension API   ◄──── render: JSON ──► HNode tree ──► sanitize
   (no deps)                                                                          │
                                       ┌──────────────────────┬───────────────────┼─────────────────────┐
                                       ▼                      ▼                   ▼                     ▼
                                 HTML string            React elements       innerHTML /          custom element
                                 renderToHtml           <Viewer>             mountViewer          <lexical-blog-viewer>
```

## Layers

| Layer | May import | Must not | Why |
| --- | --- | --- | --- |
| `core` | itself | packages, browser globals | the contract shared by everything; runs anywhere |
| `render` | `core` (+ `katex` in `render/katex.ts` only) | React, Lexical, DOM globals | identical output on every runtime |
| `react` | `core`, `render`, `react` | Lexical, DOM, editor | RSC/SSR safe, tiny |
| `html` | `core`, `render` | React, Lexical | framework-free viewer |
| `editor` | everything | – | the only layer that needs Lexical and a browser |

`scripts/check-boundaries.mjs` enforces the table; `tests/unit/bundles.test.ts` bundles every built entry point and checks
its dependency footprint and size.

## The intermediate tree (HNode)

Renderers produce a small tree (`element` / `text` / trusted `raw`), not strings:

- **Sanitization happens once, on the tree**, so it needs no DOM, and the same allowlist protects the HTML string, React
  elements and `innerHTML`. A renderer, built-in or from an extension, cannot emit what the policy forbids.
- **Serialization is trivial and deterministic** (`serializeToHtml`), which is what makes cross-environment goldens possible.
- **React output is a straight conversion** (`hnodesToReact`): no `dangerouslySetInnerHTML` except for trusted `raw` nodes
  (KaTeX).

`raw` exists because KaTeX emits markup with SVG that cannot be rebuilt from the allowlist. Only renderer *code* can create
it; user-controlled strings never reach it (KaTeX escapes its input and runs with `trust: false`).

## Fidelity: the oracle

The renderers reimplement `exportDOM` for ~35 node types. To keep them honest, `tests/oracle` builds documents with the
**real editor nodes**, runs Lexical's own `$generateHtmlFromNodes` in jsdom, and requires the renderer to produce the same
normalized document. Deviations are explicit and explained in the test (e.g. `rel="noopener"` on `_blank` links, `open`
only on open collapsibles).

## Extensions

Two halves, shipped separately so servers never import editor code. See [extensions.md](extensions.md).

## Build

`tsup` per layer: environment-agnostic layers are built with `platform: neutral` and `splitting`; the editor is one bundle
(so all CSS lands in `dist/editor/index.css`, including KaTeX and react-day-picker, and no `.css` import survives in the JS,
which would break plain-Node SSR) with a `"use client"` banner. Dependencies stay external. `sideEffects` is limited to CSS
so bundlers can drop everything unused.

## Decisions worth remembering

- **One npm package with subpath exports, extensions as separate packages.** Components are separated by import path and
  enforced layering; extensions get their own release cadence and dependency trees, like `@lexical/*`.
- **DOM-free rendering over a DOM shim.** jsdom was the source of serverless failures and made edge runtimes impossible.
- **Deterministic by default.** No locale, time zone, `Intl` or environment-dependent output.
- **Safe by default, opt-out explicit.** `sanitize: false` exists for fully trusted content only.
- **Failures are local.** An unknown node renders its children; a throwing renderer drops only its node and reports via
  `onWarning`; a bad upload removes only its placeholder.
