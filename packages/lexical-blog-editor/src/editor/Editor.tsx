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
import { useEffect, useRef, useState } from "react";

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
import MediaPlugin from "./plugins/MediaPlugin";
import MediaUploadPlugin from "./plugins/MediaUploadPlugin";
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

import type {
  AnyLexicalExtensionArgument,
  EditorState,
  LexicalEditor,
} from "lexical";

import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { TableContext } from "./plugins/TablePlugin";
import { ToolbarContext } from "./context/ToolbarContext";

import React, { useMemo } from "react";
import PlaygroundEditorTheme from "./themes/PlaygroundEditorTheme";
import PlaygroundNodes from "./nodes/PlaygroundNodes/PlaygroundNodes";
import { buildHTMLConfig } from "./buildHTMLConfig";
import {
  resolveEditorExtensions,
  type EditorExtension,
  type EditorPluginProps,
} from "./extensions";
import { EditorExtensionsContext } from "./extensions/context";
import { UploadManagerContext } from "./upload/context";
import { UploadManager } from "./upload/UploadManager";
import type { MediaUploadOptions } from "./upload/types";
import type { ComponentType, ReactNode } from "react";

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

export interface EditorProps extends MediaUploadOptions {
  placeholder?: string;
  /** Initial content: a saved JSON string or an `EditorState`. */
  initialState?: EditorState | string;
  /** Called on every editor update with the new state. */
  onChange: (state: EditorState) => void;
  /**
   * Blog-editor extensions (nodes, plugins, menu entries, theme). See
   * `defineEditorExtension`. Pass a stable array (module constant or `useMemo`).
   */
  extensions?: ReadonlyArray<EditorExtension>;
  /**
   * Plain Lexical extensions (`defineExtension`, `configExtension`), installed
   * as dependencies of the editor exactly as Lexical documents.
   */
  lexicalExtensions?: ReadonlyArray<AnyLexicalExtensionArgument>;
  /** Extra React children rendered inside the editor (your own Lexical plugins). */
  children?: ReactNode;
  /** Called once with the Lexical editor instance. */
  onReady?: (editor: LexicalEditor) => void;
}

function OnChangePlugin({
  onChange,
}: {
  onChange: (state: EditorState) => void;
}) {
  const [editor] = useLexicalComposerContext();
  // Keep the latest callback without re-registering the listener.
  const latest = useRef(onChange);
  latest.current = onChange;
  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        latest.current(editorState);
      }),
    [editor],
  );
  return null;
}

function ReadyPlugin({ onReady }: { onReady?: (editor: LexicalEditor) => void }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    onReady?.(editor);
    // Only on mount: the editor instance never changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);
  return null;
}

export const EditorComponent = ({
  placeholder = "Enter some text...",
  onChange,
  onReady,
  extensionPlugins = [],
  children,
}: {
  placeholder?: string;
  onChange: (state: EditorState) => void;
  onReady?: (editor: LexicalEditor) => void;
  extensionPlugins?: ReadonlyArray<ComponentType<EditorPluginProps>>;
  children?: ReactNode;
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
        <MediaUploadPlugin />
        <MediaPlugin />
        <ReadyPlugin onReady={onReady} />
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
        {extensionPlugins.map((Plugin, index) => (
          <Plugin
            key={index}
            anchorElem={floatingAnchorElem}
            isEditable={isEditable}
          />
        ))}
        {children}
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
  extensions,
  lexicalExtensions,
  children,
  onReady,
  ...uploadOptions
}: EditorProps) => {
  const resolved = useMemo(
    () => resolveEditorExtensions(extensions),
    [extensions],
  );

  // The manager reads the latest options on every call, so inline `onUpload`
  // handlers never go stale and never recreate the manager.
  const uploadRef = useRef<MediaUploadOptions>(uploadOptions);
  uploadRef.current = uploadOptions;
  const manager = useMemo(() => new UploadManager(() => uploadRef.current), []);
  useEffect(
    () => manager.subscribe((event) => uploadRef.current.onUploadEvent?.(event)),
    [manager],
  );

  const app = useMemo(() => {
    const base = buildHTMLConfig();
    return defineExtension({
      $initialEditorState: initialState ?? $prepopulatedRichText,
      html: {
        import: { ...(base.import ?? {}), ...(resolved.html.import ?? {}) },
        export: new Map([
          ...(base.export ?? []),
          ...(resolved.html.export ?? []),
        ]),
      },
      name: "BlogEditor",
      namespace: "BlogEditor",
      nodes: [...PlaygroundNodes, ...resolved.nodes],
      theme: { ...PlaygroundEditorTheme, ...resolved.theme },
      dependencies: [
        ...resolved.lexicalExtensions,
        ...(lexicalExtensions ?? []),
      ],
    });
  }, [initialState, resolved, lexicalExtensions]);

  const menus = useMemo(
    () => ({ slashMenu: resolved.slashMenu, insertMenu: resolved.insertMenu }),
    [resolved],
  );

  return (
    <div className="editor-shell">
      <UploadManagerContext.Provider value={manager}>
        <EditorExtensionsContext.Provider value={menus}>
          <LexicalExtensionComposer extension={app} contentEditable={null}>
            <TableContext>
              <ToolbarContext>
                <EditorComponent
                  placeholder={placeholder}
                  onChange={onChange}
                  onReady={onReady}
                  extensionPlugins={resolved.plugins}
                >
                  {children}
                </EditorComponent>
              </ToolbarContext>
            </TableContext>
          </LexicalExtensionComposer>
        </EditorExtensionsContext.Provider>
      </UploadManagerContext.Provider>
    </div>
  );
};
