"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";

import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";

import { HashtagPlugin } from "@lexical/react/LexicalHashtagPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import { CAN_USE_DOM } from "@lexical/utils";
import { useEffect, useState } from "react";

/* Custom Plugins */
import ActionsPlugin from "./plugins/ActionsPlugin";
import AutoEmbedPlugin from "./plugins/AutoEmbedPlugin";
import AutoLinkPlugin from "./plugins/AutoLinkPlugin";
import CodeActionMenuPlugin from "./plugins/CodeActionMenuPlugin";
// import CodeHighlightPrismPlugin from "./plugins/CodeHighlightPrismPlugin";
import CodeHighlightShikiPlugin from "./plugins/CodeHighlightShikiPlugin";
import CollapsiblePlugin from "./plugins/CollapsiblePlugin";
import ComponentPickerPlugin from "./plugins/ComponentPickerPlugin";
import DateTimePlugin from "./plugins/DateTimePlugin";
import DragDropPaste from "./plugins/DragDropPastePlugin";
import DraggableBlockPlugin from "./plugins/DraggableBlockPlugin";
import EmojiPickerPlugin from "./plugins/EmojiPickerPlugin";
import EmojisPlugin from "./plugins/EmojisPlugin";
import EquationsPlugin from "./plugins/EquationsPlugin";
import FigmaPlugin from "./plugins/FigmaPlugin";
import FloatingLinkEditorPlugin from "./plugins/FloatingLinkEditorPlugin";
import FloatingTextFormatToolbarPlugin from "./plugins/FloatingTextFormatToolbarPlugin";
import HorizontalRulePlugin from "./plugins/HorizontalRulePlugin";
import ImagesPlugin from "./plugins/ImagesPlugin";
import KeywordsPlugin from "./plugins/KeywordsPlugin";
import { LayoutPlugin } from "./plugins/LayoutPlugin/LayoutPlugin";
import LinkPlugin from "./plugins/LinkPlugin";
import MarkdownShortcutPlugin from "./plugins/MarkdownShortcutPlugin";
import ShortcutsPlugin from "./plugins/ShortcutsPlugin";
import SpeechToTextPlugin from "./plugins/SpeechToTextPlugin";
import TabFocusPlugin from "./plugins/TabFocusPlugin";
import TableCellActionMenuPlugin from "./plugins/TableActionMenuPlugin";
import TableCellResizer from "./plugins/TableCellResizer";
import TableHoverActionsV2Plugin from "./plugins/TableHoverActionsV2Plugin";
import TableScrollShadowPlugin from "./plugins/TableScrollShadowPlugin";
import ToolbarPlugin from "./plugins/ToolbarPlugin";
import TwitterPlugin from "./plugins/TwitterPlugin";
import YouTubePlugin from "./plugins/YouTubePlugin";

import ContentEditable from "./ui/ContentEditable";
import { $createHeadingNode } from "@lexical/rich-text";
import {
  $getRoot,
  $createParagraphNode,
  defineExtension,
  $createTextNode,
} from "lexical";

import type { EditorState } from "lexical";

import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { TableContext } from "./plugins/TablePlugin";
import { ToolbarContext } from "./context/ToolbarContext";

import React, { useMemo } from "react";
import PlaygroundEditorTheme from "./themes/PlaygroundEditorTheme";
import PlaygroundNodes from "./nodes/PlaygroundNodes/PlaygroundNodes";
import { buildHTMLConfig } from "./buildHTMLConfig";

import "./index.css";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
// import { HorizontalRuleExtension } from "@lexical/extension";

function $prepopulatedRichText(): void {
  const root = $getRoot();
  const heading = $createHeadingNode("h1");
  heading.append($createTextNode("Rich Blog Editor"));
  root.append(heading);
  const paragraph = $createParagraphNode();
  paragraph.append($createTextNode("Welcome to the rich blog editor!"));
  root.append(paragraph);
}

export interface EditorProps {
  placeholder?: string;
  initialState?: EditorState;
  onChange: (state: EditorState) => void;
}

export const EditorComponent = ({
  placeholder = "Enter some text...",
  onChange,
}: {
  placeholder?: string;
  onChange: (state: EditorState) => void;
}) => {
  const isEditable = useLexicalEditable();

  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);
  const [isSmallWidthViewport, setIsSmallWidthViewport] =
    useState<boolean>(false);
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false);

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  function OnChangePlugin({
    onChange,
  }: {
    onChange: (state: EditorState) => void;
  }) {
    const [editor] = useLexicalComposerContext();
    // Wrap our listener in useEffect to handle the teardown and avoid stale references.
    useEffect(() => {
      // most listeners return a teardown function that can be called to clean them up.
      return editor.registerUpdateListener(({ editorState }) => {
        onChange(editorState);
      });
    }, [editor, onChange]);
    return null;
  }

  useEffect(() => {
    const updateViewPortWidth = () => {
      const isNextSmallWidthViewport =
        CAN_USE_DOM && window.matchMedia("(max-width: 1025px)").matches;

      if (isNextSmallWidthViewport !== isSmallWidthViewport) {
        setIsSmallWidthViewport(isNextSmallWidthViewport);
      }
    };
    updateViewPortWidth();
    window.addEventListener("resize", updateViewPortWidth);

    return () => {
      window.removeEventListener("resize", updateViewPortWidth);
    };
  }, [isSmallWidthViewport]);

  return (
    <>
      <ToolbarPlugin
        editor={editor}
        activeEditor={activeEditor}
        setActiveEditor={setActiveEditor}
        setIsLinkEditMode={setIsLinkEditMode}
      />
      <ShortcutsPlugin
        editor={activeEditor}
        setIsLinkEditMode={setIsLinkEditMode}
      />
      <div className={`editor-container`}>
        <DragDropPaste />
        <AutoFocusPlugin />
        <ClearEditorPlugin />
        <ComponentPickerPlugin />
        <EmojiPickerPlugin />
        <AutoEmbedPlugin />
        <EmojisPlugin />
        <HashtagPlugin />
        <HorizontalRulePlugin />
        <KeywordsPlugin />
        <SpeechToTextPlugin />
        <AutoLinkPlugin />
        <DateTimePlugin />
        <HistoryPlugin />
        <RichTextPlugin
          contentEditable={
            <div className="editor-scroller">
              <div className="editor" ref={onRef}>
                <ContentEditable placeholder={placeholder} />
              </div>
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <OnChangePlugin onChange={onChange} />
        <MarkdownShortcutPlugin />
        <CodeHighlightShikiPlugin />
        <ListPlugin hasStrictIndent={true} />
        <CheckListPlugin />
        <TablePlugin />
        <TableCellResizer />
        <TableScrollShadowPlugin />
        <ImagesPlugin />
        <LinkPlugin hasLinkAttributes={true} />
        <TwitterPlugin />
        <YouTubePlugin />
        <FigmaPlugin />
        <ClickableLinkPlugin disabled={isEditable} />
        <EquationsPlugin />
        <TabFocusPlugin />
        <TabIndentationPlugin maxIndent={7} />
        <CollapsiblePlugin />
        <LayoutPlugin />
        {floatingAnchorElem && (
          <>
            <FloatingLinkEditorPlugin
              anchorElem={floatingAnchorElem}
              isLinkEditMode={isLinkEditMode}
              setIsLinkEditMode={setIsLinkEditMode}
            />
            <TableCellActionMenuPlugin
              anchorElem={floatingAnchorElem}
              cellMerge={true}
            />
          </>
        )}
        {floatingAnchorElem && !isSmallWidthViewport && (
          <>
            <DraggableBlockPlugin anchorElem={floatingAnchorElem} />
            <CodeActionMenuPlugin anchorElem={floatingAnchorElem} />
            <TableHoverActionsV2Plugin anchorElem={floatingAnchorElem} />
            <FloatingTextFormatToolbarPlugin
              anchorElem={floatingAnchorElem}
              setIsLinkEditMode={setIsLinkEditMode}
            />
          </>
        )}
        <ActionsPlugin
          shouldPreserveNewLinesInMarkdown={true}
          useCollabV2={false}
        />
      </div>{" "}
    </>
  );
};

/**
 * A full Rich Text Editor component.
 * @param {EditorProps} props
 * @returns {JSX.Element}
 */

export const Editor: React.FC<EditorProps> = ({
  placeholder = "Enter some text...",
  initialState,
  onChange,
}: EditorProps) => {
  const app = useMemo(
    () =>
      defineExtension({
        $initialEditorState: initialState ?? $prepopulatedRichText,
        html: buildHTMLConfig(),
        name: "BlogEditor",
        namespace: "BlogEditor",
        nodes: PlaygroundNodes,
        theme: PlaygroundEditorTheme,
        // dependencies: [HorizontalRuleExtension],
      }),
    [initialState],
  );

  return (
    <div className="editor-shell">
      <LexicalExtensionComposer extension={app} contentEditable={null}>
        <TableContext>
          <ToolbarContext>
            {<EditorComponent placeholder={placeholder} onChange={onChange} />}
          </ToolbarContext>
        </TableContext>
      </LexicalExtensionComposer>
    </div>
  );
};
