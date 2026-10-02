# lexical-blog-editor monorepo

Rich-text editing and rendering for blogs, built on [Lexical](https://lexical.dev/). This repository is a pnpm workspace
that publishes the packages below.

| Package | Path | npm |
| --- | --- | --- |
| **`@scottjgilbert/lexical-blog-editor`** | [`packages/lexical-blog-editor`](packages/lexical-blog-editor) | the editor, viewers and renderer, as separate subpath exports |
| `@scottjgilbert/lexical-blog-editor-ext-callout` | [`packages/ext-callout`](packages/ext-callout) | reference extension: callout blocks |

Start with the **[package README](packages/lexical-blog-editor/README.md)**, which documents every entry point, the upload
API, the extension API and migration from v1.

## Layout

```
packages/
  lexical-blog-editor/            published as @scottjgilbert/lexical-blog-editor
    src/
      core/      types, sanitizer, theme, render-extension API   no React, no DOM, no Lexical
      render/    DOM-free renderer + KaTeX extension              depends on core only
      react/     <Viewer>                                         core + render + react
      html/      mountViewer, <lexical-blog-viewer>               core + render
      editor/    the React editor, upload API, editor extensions  anything
      styles/    ViewerTheme.css, ViewerThemeComplete.css
  ext-callout/                    published as ...-ext-callout (separate npm package)
e2e/apps/        apps that consume the *built* packages: vite-spa, next-app, express-server, edge-function
tests/           unit · oracle · env · node · e2e (see docs/testing.md)
docs/            architecture, extensions, testing, styling
```

The layering is enforced: `pnpm check:boundaries` fails the build if, for example, `render/` imports React or `core/`
references `window`. Bundle tests then assert what each built entry point actually pulls in.

## Develop

```bash
pnpm install
pnpm build              # builds every package (tsup: ESM + CJS + types)
pnpm typecheck
pnpm check:boundaries   # layering rules
pnpm test               # unit, oracle, cross-environment, native Node, Express, edge VM
pnpm test:e2e           # Playwright: Vite SPA and Next.js (needs a Chromium; CI installs it)
pnpm verify             # everything above (+ pack smoke test)
```

Playwright is pinned to the version whose Chromium build is preinstalled in the cloud dev environment; elsewhere run
`pnpm exec playwright install chromium` once.

Regenerating test data (only when behavior changes on purpose):

```bash
UPDATE_FIXTURES=1 pnpm vitest run --project oracle     # fixtures from real editor nodes
pnpm build && UPDATE_GOLDEN=1 pnpm vitest run --project env-node   # golden HTML
```

## Documentation

- [Package README](packages/lexical-blog-editor/README.md): usage and API
- [Architecture](docs/architecture.md): layers, data flow, design decisions
- [Writing extensions](docs/extensions.md): render half, editor half, packaging, an AI-autocomplete sketch
- [Testing](docs/testing.md): what is tested where, and how to add fixtures
- [Styling](docs/styling.md)
- [Changelog](CHANGELOG.md)

## License

MIT
