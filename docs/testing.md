# Testing

```bash
pnpm build && pnpm test        # Vitest: all projects below except Playwright
pnpm test:e2e                  # Playwright: browser + Next.js (webpack)
pnpm test:lab                  # the lab: real workerd, Next.js + Turbopack, Next.js on workerd (slow, opt-in)
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

## The lab: real workerd and Turbopack

`pnpm test` and `pnpm test:e2e` run anywhere in a couple of minutes. The *lab* is the opt-in layer that mimics production
runtimes more closely and is slower (it builds several Next.js apps and downloads the `workerd` binary through npm):

```bash
pnpm build
pnpm test:lab:workerd                      # Vitest, ~10 s
pnpm test:lab:next                         # Playwright, every Next target in turn, ~6 min
pnpm test:lab:next next16-turbopack        # or just some of them
pnpm test:lab                              # both
```

### Real workerd (`tests/lab/workerd.test.ts`, `e2e/apps/workerd-worker`)

1. `wrangler deploy --dry-run` bundles the worker in production mode, exactly like a deploy, once per configuration:
   `plain`, `nodejs_compat`, and an old compatibility date (`2023-05-18`).
2. The resulting `worker.js` (the artifact that would be uploaded) is served by the bare **`workerd` binary** with a generated
   Cap'n Proto config, the same runtime Cloudflare runs. One more pass goes through `wrangler dev --local`
   (development bundle, the developer-machine path).
3. Every fixture is rendered over HTTP and compared byte-for-byte with the same goldens as Node, jsdom and the edge VM, for
   both the headless renderer and the React viewer (`renderToReadableStream`); hostile documents must equal the hostile
   golden. The API surface of all four entry points is compared with Node's.

It also covers what only a real isolate can: the worker reports `Cloudflare-Workers` as its user agent, has no `window`,
`document` or (without `nodejs_compat`) `process`/`Buffer`, and **code generation from strings is disabled** (so any
`eval`/`new Function` on a render path fails the suite; verified by mutation). A 250-deep document renders on workerd's
stack, a 3000-deep one is a `RenderLimitError` (HTTP 413), 80 concurrent requests in one isolate never leak into each
other, 25 repeated requests are identical, and a 1.2 MB document renders in tens of milliseconds. The production bundle,
including React's server renderer, KaTeX and the callout extension, is ~224 KiB gzipped, well inside the 3 MiB (free) and
10 MiB (paid) limits, and contains no `unenv` polyfills, `jsdom` or `dompurify`.

Not modelled: Cloudflare's per-request CPU limits (workerd does not enforce them locally) and KV/R2/D1 bindings.

### Next.js with Turbopack (`playwright.lab.config.ts`, `e2e/apps/next-app`, `e2e/apps/next16-app`)

The same `tests/e2e/next.spec.ts` (RSC viewer with JS disabled, SSR placeholder → hydration, extensions, Node and Edge route
handlers, golden output, hostile input, JS budget) runs against one server at a time:

| Target | Next | Bundler | Server |
| --- | --- | --- | --- |
| `next15-turbopack` | 15.5 | Turbopack | production build |
| `next15-turbopack-dev` | 15.5 | Turbopack | `next dev` |
| `next16-turbopack` | 16.3 | Turbopack (default) | production build |
| `next16-turbopack-dev` | 16.3 | Turbopack (default) | `next dev` |
| `next16-webpack` | 16.3 | webpack | production build |

`e2e/apps/next16-app` has no routes of its own: `sync-app.mjs` copies `next-app/app` into it before each build. The "ships
no editor code" check is a *relative* budget (the viewer page may weigh at most 2 KB more than a page that ignores the
package), because Next's own runtime differs between majors.

### Next.js on workerd (`e2e/apps/next-cloudflare`)

The ultimate combination: Next 16 (Turbopack) built by [OpenNext](https://opennext.js.org/cloudflare) and served by
`wrangler dev` inside real workerd. Same spec, minus the Edge route handler (OpenNext has no Edge runtime; everything runs
in the one worker) and with the fixtures bundled instead of read from disk (workerd has no file system). Two variants of the
editor page are built, each with a worker size budget:

| Target | Editor page | Worker upload (raw / gzip) | Fits |
| --- | --- | --- | --- |
| `next16-workerd-lean` | `next/dynamic(..., { ssr: false })` | 5.4 MiB / 1.1 MiB | free plan (3 MiB) and paid (10 MiB) |
| `next16-workerd` | `Editor` imported directly into a client page | 34.9 MiB / 6.5 MiB | paid plan only |

The difference is the editor's server-side module graph (`shiki` grammars and themes, `prettier` parsers are in Next's
default `serverExternalPackages`, so they are traced into the server output). Load the editor client-only when the server
bundle is size-constrained; see "Next.js and serverless" in the package README.

### Findings the lab produced

- **Next 15.5 + Turbopack + pnpm prints 11 "Package prettier/shiki can't be external" warnings.** They are benign (Turbopack
  falls back to bundling and every test passes), and silenced by adding `prettier` and `shiki` to the *app's* dependencies.
  Next 16 does not print them.
- **Server bundles that include the editor are large** (table above).
- Nothing in the package itself needed to change to pass on real workerd or Turbopack.

### Why the edge VM suite still exists

`@edge-runtime/vm` (project `env-edge`, `tests/node/edge-function.test.ts`) runs anywhere in plain Node with no binary, so it
stays in the default `pnpm test` as the fast guard for "no Node built-ins, no DOM, no `require`". The lab confirms the same
bundle behaves identically on real workerd.
