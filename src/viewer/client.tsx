"use client";

import { createEditor, EditorState } from "lexical";
import PlaygroundNodes from "../nodes/PlaygroundNodes/ServerPlaygroundNodes";
import React, { JSX, useMemo } from "react";
import DOMPurify from "dompurify";
import { $generateHtmlFromNodes } from "@lexical/html";
import { buildHTMLConfig } from "../buildHTMLConfig";
import { stripHtmlCode } from "@igorskyflyer/strip-html";
import { Tweet } from "react-tweet";
import parse, { Element } from "html-react-parser";
import theme from "../themes/ViewerTheme";

export interface ViewerProps {
  state: EditorState | string;
  sanitize?: boolean;
}

/**
 * A viewer component for displaying parsed editor state in the DOM. Returns a div containing dangerouslySetInnerHTML.
 *
 * HTML content is sanitized by stripping tags and running DOMPurify by default. This can be disabled by setting the `sanitize` prop to false - **not recommended for client-facing editors**.
 *
 * Note: DOMPurify is configured to allow iframes. A custom whitelist is applied to only allow iframes from YouTube, Figma, and Twitter.
 * @param {ViewerProps} props
 * @returns {JSX.Element}
 */

export const Viewer: React.FC<ViewerProps> = ({
  state,
  sanitize = true,
}: ViewerProps): JSX.Element => {
  // Create editor instance per component to avoid module-level singleton issues
  const editor = useMemo(
    () =>
      createEditor({
        namespace: "ViewerEditor",
        nodes: [...PlaygroundNodes],
        onError(error) {
          throw error;
        },
        html: buildHTMLConfig(),
        theme,
      }),
    [],
  );
  try {
    if (typeof state === "string") {
      if (sanitize) state = stripHtmlCode(state);
      editor.setEditorState(editor.parseEditorState(state));
    } else {
      editor.setEditorState(state);
    }

    let clean = "";

    if (sanitize)
      editor.update(() => {
        const html = $generateHtmlFromNodes(editor);

        clean = DOMPurify.sanitize(html, {
          ADD_TAGS: ["iframe", "blockquote"],
          ADD_ATTR: [
            "src",
            "width",
            "height",
            "frameborder",
            "allowfullscreen",
            "class",
            "href",
          ],
          FORBID_ATTR: ["on*"],
        });

        const allowedSources = [
          "https://www.youtube.com/embed",
          "https://www.figma.com/embed",
          "https://platform.twitter.com/widgets.js",
        ];

        const parser = new DOMParser();
        const doc = parser.parseFromString(clean, "text/html");
        const iframes = doc.querySelectorAll("iframe");

        iframes.forEach((iframe) => {
          const src = iframe.getAttribute("src");
          if (
            !src ||
            !allowedSources.some((source) => src.startsWith(source))
          ) {
            iframe.remove();
          }
        });

        clean = doc.body.innerHTML;
      });
    else
      editor.update(() => {
        clean = $generateHtmlFromNodes(editor);
      });

    const parsedContent = parse(clean, {
      replace: (domNode) => {
        if (
          domNode instanceof Element &&
          domNode.name === "div" &&
          domNode.attribs["data-lexical-tweet-id"]
        ) {
          const tweetId = domNode.attribs["data-lexical-tweet-id"];
          return <Tweet id={tweetId} />;
        }
      },
    });

    return <div>{parsedContent}</div>;
  } catch (error) {
    console.error(
      "Error generating viewer output. There may be an error in the editor state or the HTML generation process.\n",
      error,
    );
    return (
      <div className="LexicalBlogViewer__Error">
        <strong>Error:</strong> Unable to render content.
      </div>
    );
  }
};

export default Viewer;
