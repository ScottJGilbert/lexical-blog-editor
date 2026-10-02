"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { DRAG_DROP_PASTE } from "@lexical/rich-text";
import { mergeRegister } from "@lexical/utils";
import {
  $createParagraphNode,
  $getRoot,
  $getNodeByKey,
  $getSelection,
  $insertNodes,
  $isParagraphNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $nodesOfType,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  createCommand,
  type LexicalCommand,
  type LexicalEditor,
  type LexicalNode,
} from "lexical";
import { useEffect } from "react";

import { $createImageNode } from "../../nodes/ImageNode";
import { $createAudioNode } from "../../nodes/Media/AudioNode";
import { $createFileNode } from "../../nodes/Media/FileNode";
import { $createVideoNode } from "../../nodes/Media/VideoNode";
import { useUploadManager } from "../../upload/context";
import type { MediaKind, MediaUploadResult } from "../../upload/types";
import type { UploadManager } from "../../upload/UploadManager";
import {
  $createUploadPlaceholderNode,
  $isUploadPlaceholderNode,
  UploadPlaceholderNode,
} from "../../upload/UploadPlaceholderNode";

export interface UploadMediaPayload {
  files: ReadonlyArray<File>;
  /** Alt text for images (defaults to the file name). */
  altText?: string;
}

/**
 * Upload files and insert them at the selection. This is the single entry
 * point used by the toolbar, the slash menu, paste and drag & drop; dispatch
 * it yourself to build custom upload UI:
 *
 * ```ts
 * editor.dispatchCommand(UPLOAD_MEDIA_COMMAND, { files: [file] });
 * ```
 */
export const UPLOAD_MEDIA_COMMAND: LexicalCommand<UploadMediaPayload> =
  createCommand("UPLOAD_MEDIA_COMMAND");

function $findPlaceholder(uploadId: string): UploadPlaceholderNode | null {
  return $nodesOfType(UploadPlaceholderNode).find((n) => n.getUploadId() === uploadId) ?? null;
}

function $insertPlaceholder(node: UploadPlaceholderNode): void {
  const selection = $getSelection();
  if ($isRangeSelection(selection)) {
    $insertNodes([node]);
    if ($isRootOrShadowRoot(node.getParentOrThrow())) {
      const paragraph = $createParagraphNode();
      node.replace(paragraph);
      paragraph.append(node);
    }
  } else {
    // No caret (e.g. the file was picked from a dialog): append at the end.
    $getRoot().append($createParagraphNode().append(node));
  }
}

function $createMediaNode(kind: MediaKind, result: MediaUploadResult, file: File, altText?: string): LexicalNode {
  switch (kind) {
    case "image":
      return $createImageNode({
        src: result.src,
        altText: result.altText ?? altText ?? file.name,
        width: result.width,
        height: result.height,
      });
    case "video":
      return $createVideoNode({
        src: result.src,
        poster: result.poster,
        title: result.title ?? file.name,
        width: result.width,
        height: result.height,
        mimeType: result.mimeType ?? (file.type || undefined),
        controls: true,
      });
    case "audio":
      return $createAudioNode({
        src: result.src,
        title: result.title ?? file.name,
        mimeType: result.mimeType ?? (file.type || undefined),
        controls: true,
      });
    default:
      return $createFileNode({
        src: result.src,
        fileName: result.fileName ?? file.name,
        fileSize: result.fileSize ?? file.size,
        mimeType: result.mimeType ?? (file.type || undefined),
      });
  }
}

function $replacePlaceholder(placeholder: UploadPlaceholderNode, node: LexicalNode, kind: MediaKind): void {
  if (kind === "image") {
    placeholder.replace(node);
    return;
  }
  // Block-level media: take over the placeholder's paragraph when it is the only child.
  const parent = placeholder.getParent();
  if ($isParagraphNode(parent) && parent.getChildrenSize() === 1) {
    parent.replace(node);
  } else {
    const top = placeholder.getTopLevelElementOrThrow();
    placeholder.remove();
    top.insertAfter(node);
  }
  if (node.getNextSibling() === null) node.insertAfter($createParagraphNode());
}

function startUpload(editor: LexicalEditor, manager: UploadManager, file: File, altText?: string): void {
  const remove = (id: string) =>
    editor.update(() => {
      $findPlaceholder(id)?.remove();
    });

  void manager.start(file, {
    onStart: (upload) =>
      editor.update(() => {
        $insertPlaceholder($createUploadPlaceholderNode(upload.id, file.name, upload.kind));
      }),
    onSuccess: (upload, result) =>
      editor.update(() => {
        const placeholder = $findPlaceholder(upload.id);
        if (!placeholder) return; // the user removed it; nothing to insert
        $replacePlaceholder(placeholder, $createMediaNode(upload.kind, result, file, altText), upload.kind);
      }),
    onError: (upload) => upload && remove(upload.id),
    onAbort: (upload) => remove(upload.id),
  });
}

export default function MediaUploadPlugin(): null {
  const [editor] = useLexicalComposerContext();
  const manager = useUploadManager();

  useEffect(() => {
    if (!manager) return;
    if (!editor.hasNodes([UploadPlaceholderNode])) {
      throw new Error("MediaUploadPlugin: UploadPlaceholderNode not registered on editor");
    }
    return mergeRegister(
      editor.registerCommand(
        UPLOAD_MEDIA_COMMAND,
        ({ files, altText }) => {
          for (const file of files) startUpload(editor, manager, file, altText);
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      // Files pasted or dropped onto the editor.
      editor.registerCommand(
        DRAG_DROP_PASTE,
        (files) => {
          editor.dispatchCommand(UPLOAD_MEDIA_COMMAND, { files });
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      // A placeholder with no live upload (e.g. loaded from saved state) is stale.
      editor.registerNodeTransform(UploadPlaceholderNode, (node) => {
        if (!manager.pending.has(node.getUploadId())) node.remove();
      }),
      // Deleting a placeholder cancels its upload.
      editor.registerMutationListener(UploadPlaceholderNode, (mutations, { prevEditorState }) => {
        for (const [key, type] of mutations) {
          if (type !== "destroyed") continue;
          const id = prevEditorState.read(() => {
            const node = $getNodeByKey(key);
            return $isUploadPlaceholderNode(node) ? node.getUploadId() : null;
          });
          if (id) manager.cancel(id);
        }
      }),
    );
  }, [editor, manager]);

  useEffect(() => () => manager?.cancelAll(), [manager]);

  return null;
}

