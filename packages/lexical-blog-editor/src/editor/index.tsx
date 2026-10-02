"use client";

/**
 * `@scottjgilbert/lexical-blog-editor/editor`
 *
 * The React editor, its extension API and the media-upload API. Import the
 * stylesheet once: `import "@scottjgilbert/lexical-blog-editor/editor/styles.css"`.
 */
export { Editor } from "./EditorExport";
export type { EditorProps } from "./EditorExport";
export { Editor as default } from "./EditorExport";

export type { EditorState, LexicalEditor } from "lexical";

// Extensions: add nodes, plugins, menu entries and Lexical extensions.
export { defineEditorExtension, resolveEditorExtensions } from "./extensions";
export type {
  EditorExtension,
  EditorPluginProps,
  ExtensionMenuContext,
  InsertMenuItem,
  ShowModal,
  SlashMenuItem,
} from "./extensions";

// Media uploads: handler, events, and the command that drives them.
export type {
  MediaKind,
  MediaUploadContext,
  MediaUploadHandler,
  MediaUploadOptions,
  MediaUploadResult,
  UploadErrorReason,
  UploadEvent,
} from "./upload/types";
export { UploadManager, UploadError, classifyFile } from "./upload/UploadManager";
export { useUploadManager } from "./upload/context";
export { UPLOAD_MEDIA_COMMAND } from "./plugins/MediaUploadPlugin";
export type { UploadMediaPayload } from "./plugins/MediaUploadPlugin";
export {
  INSERT_AUDIO_COMMAND,
  INSERT_FILE_COMMAND,
  INSERT_VIDEO_COMMAND,
} from "./plugins/MediaPlugin";

// Node classes, for extension authors who extend or replace built-ins.
export { ImageNode, $createImageNode, $isImageNode } from "./nodes/ImageNode";
export { VideoNode, $createVideoNode, $isVideoNode } from "./nodes/Media/VideoNode";
export { AudioNode, $createAudioNode, $isAudioNode } from "./nodes/Media/AudioNode";
export { FileNode, $createFileNode, $isFileNode } from "./nodes/Media/FileNode";
export { default as builtinEditorNodes } from "./nodes/PlaygroundNodes/PlaygroundNodes";
