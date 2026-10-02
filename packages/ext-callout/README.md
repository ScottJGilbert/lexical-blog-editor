# @scottjgilbert/lexical-blog-editor-ext-callout

Callout blocks (info, tip, warning, danger) for [`@scottjgilbert/lexical-blog-editor`](../lexical-blog-editor), and the
repository's reference for writing extensions: it has an **editor half** and a **render half** behind separate entry points.

```bash
npm install @scottjgilbert/lexical-blog-editor-ext-callout
```

```tsx
// Editor (browser)
import { Editor } from "@scottjgilbert/lexical-blog-editor/editor";
import { calloutEditor } from "@scottjgilbert/lexical-blog-editor-ext-callout/editor";
import "@scottjgilbert/lexical-blog-editor-ext-callout/styles.css";

<Editor extensions={[calloutEditor]} onChange={…} />   // type "/callout" or use Insert ▸ Callout
```

```ts
// Anywhere you render: server, edge, React, HTML viewer
import { calloutRender } from "@scottjgilbert/lexical-blog-editor-ext-callout/render";

renderToHtml(json, { extensions: [calloutRender] });
<Viewer state={json} extensions={[calloutRender]} />;
```

Output: `<aside class="Callout Callout--warning" data-callout="warning" role="note">…</aside>`; unknown kinds fall back to
`info`. `…/render` has no dependencies and never loads React or Lexical.

Peer dependencies: `@scottjgilbert/lexical-blog-editor`, and for the editor half `lexical`, `@lexical/react`,
`@lexical/utils`, `react`.

See [Writing extensions](../../docs/extensions.md).
