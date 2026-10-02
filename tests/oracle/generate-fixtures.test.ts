/**
 * Regenerates tests/fixtures/*.json from the real editor nodes.
 *
 *   UPDATE_FIXTURES=1 pnpm vitest run --project oracle generate-fixtures
 *
 * Without UPDATE_FIXTURES this only checks the committed fixtures still load
 * into the real editor.
 */
import { describe, expect, it } from "vitest";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
} from "lexical";
import { $createHeadingNode } from "@lexical/rich-text";
import { $createMarkNode } from "@lexical/mark";
import { $createCodeNode } from "../../packages/lexical-blog-editor/src/editor/nodes/CodeNode/CodeNode";
import { $createCodeHighlightNode } from "../../packages/lexical-blog-editor/src/editor/nodes/CodeNode/CodeHighlightNode";
import { $createImageNode } from "../../packages/lexical-blog-editor/src/editor/nodes/ImageNode";
import { $createEquationNode } from "../../packages/lexical-blog-editor/src/editor/nodes/EquationNode";
import { $createYouTubeNode } from "../../packages/lexical-blog-editor/src/editor/nodes/YouTubeNode/ServerYouTubeNode";
import { $createTweetNode } from "../../packages/lexical-blog-editor/src/editor/nodes/TweetNode/ServerTweetNode";
import { $createFigmaNode } from "../../packages/lexical-blog-editor/src/editor/nodes/FigmaNode/ServerFigmaNode";
import { $createDateTimeNode } from "../../packages/lexical-blog-editor/src/editor/nodes/DateTimeNode/DateTimeNode";
import { $createEmojiNode } from "../../packages/lexical-blog-editor/src/editor/nodes/EmojiNode";
import { $createKeywordNode } from "../../packages/lexical-blog-editor/src/editor/nodes/KeywordNode";
import { $createMentionNode } from "../../packages/lexical-blog-editor/src/editor/nodes/MentionNode";
import { $createLayoutContainerNode } from "../../packages/lexical-blog-editor/src/editor/nodes/LayoutContainerNode";
import { $createLayoutItemNode } from "../../packages/lexical-blog-editor/src/editor/nodes/LayoutItemNode";
import { $createCollapsibleContainerNode } from "../../packages/lexical-blog-editor/src/editor/plugins/CollapsiblePlugin/CollapsibleContainerNode";
import { $createCollapsibleTitleNode } from "../../packages/lexical-blog-editor/src/editor/plugins/CollapsiblePlugin/CollapsibleTitleNode";
import { $createCollapsibleContentNode } from "../../packages/lexical-blog-editor/src/editor/plugins/CollapsiblePlugin/CollapsibleContentNode";
import { $createHashtagNode } from "@lexical/hashtag";
import { $createListNode, $createListItemNode } from "@lexical/list";
import { $createLineBreakNode, $createTabNode } from "lexical";
import { $createQuoteNode } from "@lexical/rich-text";
import { $createLinkNode, $createAutoLinkNode } from "@lexical/link";
import {
  $createTableNode,
  $createTableRowNode,
  $createTableCellNode,
  TableCellHeaderStates,
} from "@lexical/table";
import { $createHorizontalRuleNode } from "@lexical/extension";
import { createFixtureEditor, htmlToState } from "../helpers/make-fixtures";

const dir = join(__dirname, "..", "fixtures");

function build(fn: () => void): string {
  const editor = createFixtureEditor();
  editor.update(
    () => {
      $getRoot().clear();
      fn();
    },
    { discrete: true },
  );
  return JSON.stringify(editor.getEditorState().toJSON());
}

const p = (...children: any[]) => {
  const node = $createParagraphNode();
  node.append(...children);
  return node;
};
const t = (s: string, format?: number) => {
  const n = $createTextNode(s);
  if (format) n.setFormat(format);
  return n;
};

const fixtures: Record<string, () => string> = {
  "text-formats": () =>
    htmlToState(
      `<p>plain <b>bold</b> <i>italic</i> <u>underline</u> <s>strike</s> <code>code</code>
       <sub>sub</sub> <sup>sup</sup> <mark>marked</mark> <b><i>bold italic</i></b>
       <span style="color: rgb(255, 0, 0);">red</span>
       <span style="background-color: rgb(0, 255, 0); font-size: 20px;">green big</span>
       a &lt;tag&gt; &amp; "quotes"</p>
       <p style="text-align: center;">centered<br>second line</p>
       <p style="text-align: right;">right</p>
       <p dir="rtl">مرحبا</p>`,
    ),
  "headings-quote": () =>
    htmlToState(
      `<h1>One</h1><h2>Two</h2><h3>Three</h3><h4>Four</h4><h5>Five</h5><h6>Six</h6>
       <blockquote>A quote with <b>bold</b></blockquote>`,
    ),
  lists: () =>
    htmlToState(
      `<ul><li>one</li><li>two<ul><li>nested a</li><li>nested b</li></ul></li><li>three</li></ul>
       <ol><li>first</li><li>second<ol><li>inner</li></ol></li></ol>
       <ol start="4"><li>four</li><li>five</li></ol>`,
    ),
  links: () =>
    htmlToState(
      `<p>See <a href="https://example.com/a?b=1&amp;c=2">example</a>,
       <a href="https://example.com" target="_blank" rel="noopener noreferrer" title="Title">blank</a>
       and <a href="/relative/path">relative</a>
       and <a href="mailto:someone@example.com">mail</a>.</p>`,
    ),
  table: () =>
    htmlToState(
      `<table><tbody>
        <tr><th>H1</th><th>H2</th><th>H3</th></tr>
        <tr><td colspan="2">wide</td><td>x</td></tr>
        <tr><td style="background-color: rgb(255, 255, 0);">yellow</td><td>b</td><td>c</td></tr>
       </tbody></table>`,
    ),
  hr: () =>
    build(() => {
      $getRoot().append(p(t("above")), $createHorizontalRuleNode(), p(t("below")));
    }),
  code: () =>
    build(() => {
      const code = $createCodeNode("js");
      code.append(
        $createCodeHighlightNode("const", "keyword"),
        $createCodeHighlightNode(" x "),
        $createCodeHighlightNode("=", "operator"),
        $createCodeHighlightNode(" "),
        $createCodeHighlightNode("'<div>'", "string"),
        $createCodeHighlightNode(";"),
      );
      $getRoot().append(code, p(t("after")));
    }),
  "image-basic": () =>
    build(() => {
      $getRoot().append(
        p(
          $createImageNode({
            src: "https://example.com/cat.png",
            altText: 'A "cat" & <dog>',
            width: 300,
            height: 200,
            maxWidth: 500,
          }),
        ),
      );
    }),
  "image-caption": () =>
    build(() => {
      const img = $createImageNode({
        src: "https://example.com/cat.png",
        altText: "cat",
        maxWidth: 500,
        showCaption: true,
      });
      img.__caption.update(
        () => {
          $getRoot().clear().append(p(t("Caption "), t("bold", 1)));
        },
        { discrete: true },
      );
      $getRoot().append(p(img));
    }),
  equation: () =>
    build(() => {
      $getRoot().append(
        p(t("Inline "), $createEquationNode("E=mc^2", true), t(" math")),
        p($createEquationNode("\\int_0^1 x^2 dx", false)),
      );
    }),
  embeds: () =>
    build(() => {
      $getRoot().append(
        $createYouTubeNode("dQw4w9WgXcQ"),
        $createTweetNode("1234567890"),
        $createFigmaNode("abc123"),
      );
    }),
  collapsible: () =>
    build(() => {
      const c = $createCollapsibleContainerNode(true);
      const title = $createCollapsibleTitleNode();
      title.append(t("Summary"));
      const content = $createCollapsibleContentNode();
      content.append(p(t("Hidden body")));
      c.append(title, content);
      $getRoot().append(c);
    }),
  layout: () =>
    build(() => {
      const c = $createLayoutContainerNode("1fr 1fr");
      const a = $createLayoutItemNode();
      a.append(p(t("left")));
      const b = $createLayoutItemNode();
      b.append(p(t("right")));
      c.append(a, b);
      $getRoot().append(c);
    }),
  inline: () =>
    build(() => {
      $getRoot().append(
        p(
          t("When: "),
          $createDateTimeNode(new Date("2024-03-05T12:30:00.000Z")),
          t(" "),
          $createEmojiNode("emoji-smile", ":)"),
          t(" "),
          $createKeywordNode("congrats", 0),
          t(" "),
          $createMentionNode("Ada"),
          t(" "),
          $createHashtagNode("#lexical"),
          t(" "),
          (() => {
            const m = $createMarkNode(["id1"]);
            m.append(t("marked range"));
            return m;
          })(),
        ),
      );
    }),
  checklist: () =>
    build(() => {
      const list = $createListNode("check");
      const a = $createListItemNode(true);
      a.append(t("done"));
      const b = $createListItemNode(false);
      b.append(t("todo"));
      const nestedItem = $createListItemNode();
      const nested = $createListNode("check");
      const c = $createListItemNode(false);
      c.append(t("nested todo"));
      nested.append(c);
      nestedItem.append(nested);
      list.append(a, b, nestedItem);
      $getRoot().append(list);
    }),
  "block-formatting": () =>
    build(() => {
      const centered = p(t("centered, indented"));
      centered.setFormat("center");
      centered.setIndent(2);
      const rtl = p(t("rtl block"));
      rtl.setDirection("rtl");
      const quote = $createQuoteNode();
      quote.append(t("justified quote"));
      quote.setFormat("justify");
      const h = $createHeadingNode("h3");
      h.append(t("right heading"));
      h.setFormat("right");
      h.setIndent(1);
      const empty = p();
      $getRoot().append(centered, rtl, quote, h, empty);
    }),
  whitespace: () =>
    build(() => {
      $getRoot().append(
        p(t("a"), $createLineBreakNode(), t("b"), $createTabNode(), t("c")),
        (() => {
          const c = $createCodeNode("py");
          c.append(
            $createCodeHighlightNode("def", "keyword"),
            $createTabNode(),
            $createLineBreakNode(),
            $createCodeHighlightNode("pass", "keyword"),
          );
          return c;
        })(),
      );
    }),
  "text-combos": () =>
    build(() => {
      $getRoot().append(
        p(
          t("u+s", 4 | 8),
          t(" "),
          t("bold sub", 1 | 32),
          t(" "),
          t("lower", 256),
          t(" "),
          t("UPPER", 512),
          t(" "),
          t("cap", 1024),
          t(" "),
          t("code bold", 16 | 1),
          t(" "),
          t("all", 1 | 2 | 4 | 8),
        ),
      );
    }),
  "links-nested": () =>
    build(() => {
      const link = $createLinkNode("https://example.com", { target: "_blank", rel: null, title: null });
      link.append(t("bold link", 1));
      const auto = $createAutoLinkNode("https://auto.example.com");
      auto.append(t("https://auto.example.com"));
      $getRoot().append(p(link, t(" "), auto));
    }),
  "table-widths": () =>
    build(() => {
      const table = $createTableNode();
      table.setColWidths([120, 240]);
      const row = $createTableRowNode(32);
      const c1 = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
      c1.append(p(t("a")));
      c1.setWidth(120);
      c1.setBackgroundColor("#ff0000");
      const c2 = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
      c2.append(p(t("b")));
      c2.setVerticalAlign("middle");
      row.append(c1, c2);
      table.append(row);
      $getRoot().append(table);
    }),
  unicode: () =>
    build(() => {
      $getRoot().append(
        $createHeadingNode("h2").append(t("日本語 😀 ünï")),
        p(t("tab\there"), t("line1\nline2")),
      );
    }),
};

describe("fixtures", () => {
  for (const [name, make] of Object.entries(fixtures)) {
    it(name, () => {
      const file = join(dir, `${name}.json`);
      if (process.env.UPDATE_FIXTURES) {
        const state = JSON.stringify(JSON.parse(make()), null, 2) + "\n";
        writeFileSync(file, state);
      }
      expect(existsSync(file), `missing fixture ${name}`).toBe(true);
      const editor = createFixtureEditor();
      editor.setEditorState(
        editor.parseEditorState(readFileSync(file, "utf8")),
      );
    });
  }
});
