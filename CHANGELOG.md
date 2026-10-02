# Changelog

## 2.0.0 (unreleased)

A restructure into independently importable components. **Breaking**: see "Migrating from v1" in the package README.

### Added
- Monorepo (pnpm workspace). `@scottjgilbert/lexical-blog-editor` exposes `/editor`, `/react`, `/html`, `/render`,
  `/render/katex` and the root (core) as separate subpath exports; extensions are separate packages.
- **DOM-free headless renderer** (`/render`) for Node, Express, serverless and edge runtimes, with allowlist sanitization.
- **HTML client viewer** (`/html`): `mountViewer`, `renderToFragment`, `<lexical-blog-viewer>`.
- **Extension API**: `defineRenderExtension` (render half) and `defineEditorExtension` (editor half), plain Lexical
  extensions via `lexicalExtensions`, plugin children, slash-menu and Insert-menu hooks, theme and DOM import/export merging.
- **Media upload API**: `onUpload` handler, `onUploadEvent` lifecycle events, upload placeholder with progress/cancel,
  `UPLOAD_MEDIA_COMMAND`, size/type/kind limits. New **video**, **audio** and **file attachment** nodes.
- `@scottjgilbert/lexical-blog-editor-ext-callout`: reference extension.
- Test suite: differential tests against Lexical `exportDOM`, cross-environment goldens (Node, jsdom, edge VM), native
  ESM/CJS, Express, Playwright e2e for the editor and Next.js, bundle-footprint and layering checks. CI workflows.

### Changed
- Sanitization runs on the render tree (no DOM, no DOMPurify) and covers URLs, CSS, iframes and attributes.
- Tweets render as links (use `<Viewer replace>` for `react-tweet`); equations typeset via `render/katex`.
- The editor stylesheet is `…/editor/styles.css` (no longer injected by the JS) and includes KaTeX and date-picker styles.
- Date nodes render deterministic UTC text.
- Figma and YouTube embeds render in viewers; closed collapsibles render closed.
- `Editor` accepts `initialState` as a JSON string.

### Removed
- Dependencies: `jsdom`, `dompurify`, `html-react-parser`, `react-tweet`, `@igorskyflyer/strip-html`, `y-websocket`,
  `@lexical/code-shiki`.
- The sample-image button of the image dialog; the `…/viewer` entry point (use `…/react`).

### Fixed
- CommonJS `require` of the package (v1 declared it but shipped ESM).
- `ViewerTheme.css` image references now resolve in the published package.
- Importing the editor entry in plain Node (SSR) no longer fails on stylesheet imports.
