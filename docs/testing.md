# Testing

```bash
pnpm build && pnpm test        # Vitest: all projects below except Playwright
pnpm test:e2e                  # Playwright: browser + Next.js
```

Everything except the `unit*` and `oracle` projects exercises the **built** package through its `exports` map, exactly as a
consumer would. Run `pnpm build` first.

| Project | Runtime | What it proves |
| --- | --- | --- |
| `unit` | Node | sanitizer (URL, CSS, iframe, attribute rules), renderer behavior, limits, extensions, React viewer, upload manager, editor-extension resolution, `exports` map integrity, shipped CSS urls, bundle footprint |
| `unit-dom` | jsdom | HTML viewer, custom element, hydration of server markup without warnings, React ≡ HTML ≡ string output for every fixture, safety of every hostile document in every format |
| `oracle` | jsdom + real editor nodes | the renderer matches Lexical's own `exportDOM`; media/callout nodes round-trip through JSON into the renderer; also regenerates fixtures |
| `env-node` / `env-jsdom` / `env-edge` | Node / jsdom / Vercel edge-runtime VM | one suite, three runtimes, byte-identical goldens, extension package works in all |
| `node-native` | real Node (no Vite) | ESM `import` and CJS `require` of every entry, SSR-importability of the editor entries, Express (ESM + CJS) over HTTP, a Web-standard handler bundled for `workerd`/`edge-light` and run in the edge VM |
| Playwright `vite-spa` | Chromium | editor behavior, extensions, uploads (picker, paste, command, progress, cancel, delete-cancels, failure, limits, no-handler fallback), viewers agree, XSS attempts |
| Playwright `next` | Chromium + Next.js | RSC viewer with JS disabled, no editor code in the RSC page's JS, SSR placeholder → hydration without warnings, Node and Edge route handlers |

## Fixtures and goldens

- `tests/fixtures/*.json`: saved states produced by **real editor nodes** (`tests/oracle/generate-fixtures.test.ts`).
- `tests/fixtures/golden/*.html`: expected string output; `*.react.html`: expected React static markup; `hostile.json`: expected
  output for the hostile corpus in `tests/helpers/hostile.ts`.

To add a case: add a builder to `generate-fixtures.test.ts`, then

```bash
UPDATE_FIXTURES=1 pnpm vitest run --project oracle
pnpm build && UPDATE_GOLDEN=1 pnpm vitest run --project env-node
git diff tests/fixtures   # review the golden diff like code
```

A golden changing is a behavior change; review it as one.

## Allowed differences from Lexical's `exportDOM`

Listed with reasons at the top of `tests/oracle/differential.test.ts`: added `loading`/`decoding`, `rel` on `_blank` links,
`open` only when open, no editor-only `cursor`/`tabindex`, deterministic date text, no `width="inherit"`, theme classes in
captions and on layout containers.

## Why an edge VM instead of workerd?

`@edge-runtime/vm` runs in plain Node anywhere (no binary download, works offline) and enforces the key constraint: no
Node built-ins, no DOM, no `require`. Bundling the handler with the `workerd`/`edge-light` export conditions reproduces what
Cloudflare and Vercel do. Add a real `workerd` job in CI if you deploy there.
