import type { ReactNode } from "react";
import "@scottjgilbert/lexical-blog-editor/styles/ViewerTheme.css";
import "@scottjgilbert/lexical-blog-editor-ext-callout/styles.css";
import "katex/dist/katex.min.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
