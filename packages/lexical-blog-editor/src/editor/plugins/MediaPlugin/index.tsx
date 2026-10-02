"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodeToNearestRoot, mergeRegister } from "@lexical/utils";
import {
  $createParagraphNode,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  type LexicalCommand,
  type LexicalEditor,
} from "lexical";
import { useEffect, useState } from "react";
import type { JSX } from "react";

import { $createAudioNode, AudioNode, type AudioPayload } from "../../nodes/Media/AudioNode";
import { $createFileNode, FileNode, type FilePayload } from "../../nodes/Media/FileNode";
import { $createVideoNode, VideoNode, type VideoPayload } from "../../nodes/Media/VideoNode";
import Button from "../../ui/Button";
import { DialogActions, DialogButtonsList } from "../../ui/Dialog";
import FileInput from "../../ui/FileInput";
import TextInput from "../../ui/TextInput";
import { useUploadManager } from "../../upload/context";
import type { MediaKind } from "../../upload/types";
import { UPLOAD_MEDIA_COMMAND } from "../MediaUploadPlugin";

export const INSERT_VIDEO_COMMAND: LexicalCommand<VideoPayload> = createCommand("INSERT_VIDEO_COMMAND");
export const INSERT_AUDIO_COMMAND: LexicalCommand<AudioPayload> = createCommand("INSERT_AUDIO_COMMAND");
export const INSERT_FILE_COMMAND: LexicalCommand<FilePayload> = createCommand("INSERT_FILE_COMMAND");

const LABELS: Record<Exclude<MediaKind, "image">, { title: string; urlLabel: string; placeholder: string }> = {
  video: { title: "Video", urlLabel: "Video URL", placeholder: "https://example.com/clip.mp4" },
  audio: { title: "Audio", urlLabel: "Audio URL", placeholder: "https://example.com/track.mp3" },
  file: { title: "File", urlLabel: "File URL", placeholder: "https://example.com/report.pdf" },
};

/** Dialog for inserting video, audio or a file attachment by URL or upload. */
export function InsertMediaDialog({
  kind,
  activeEditor,
  onClose,
}: {
  kind: Exclude<MediaKind, "image">;
  activeEditor: LexicalEditor;
  onClose: () => void;
}): JSX.Element {
  const manager = useUploadManager();
  const labels = LABELS[kind];
  const [mode, setMode] = useState<null | "url" | "file">(null);
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const insertUrl = () => {
    if (kind === "video") activeEditor.dispatchCommand(INSERT_VIDEO_COMMAND, { src: url, controls: true });
    else if (kind === "audio") activeEditor.dispatchCommand(INSERT_AUDIO_COMMAND, { src: url, controls: true });
    else activeEditor.dispatchCommand(INSERT_FILE_COMMAND, { src: url, fileName: fileName || url.split("/").pop() || "Download" });
    onClose();
  };

  const upload = () => {
    if (!file) return;
    activeEditor.dispatchCommand(UPLOAD_MEDIA_COMMAND, { files: [file] });
    onClose();
  };

  if (!mode) {
    return (
      <DialogButtonsList>
        <Button data-test-id={`${kind}-modal-option-url`} onClick={() => setMode("url")}>
          URL
        </Button>
        <Button data-test-id={`${kind}-modal-option-file`} onClick={() => setMode("file")}>
          Upload
        </Button>
      </DialogButtonsList>
    );
  }

  if (mode === "url") {
    return (
      <>
        <TextInput
          label={labels.urlLabel}
          placeholder={labels.placeholder}
          onChange={setUrl}
          value={url}
          data-test-id={`${kind}-modal-url-input`}
        />
        {kind === "file" && (
          <TextInput label="File name" placeholder="report.pdf" onChange={setFileName} value={fileName} />
        )}
        <DialogActions>
          <Button data-test-id={`${kind}-modal-confirm-btn`} disabled={url === ""} onClick={insertUrl}>
            Confirm
          </Button>
        </DialogActions>
      </>
    );
  }

  return (
    <>
      <FileInput
        label={`${labels.title} upload`}
        accept={manager?.acceptAttribute([kind]) ?? ""}
        onChange={(files) => setFile(files?.[0] ?? null)}
        data-test-id={`${kind}-modal-file-upload`}
      />
      <DialogActions>
        <Button data-test-id={`${kind}-modal-upload-btn`} disabled={!file} onClick={upload}>
          Upload
        </Button>
      </DialogActions>
    </>
  );
}

/** Registers the commands that insert video, audio and file nodes. */
export default function MediaPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!editor.hasNodes([VideoNode, AudioNode, FileNode])) {
      throw new Error("MediaPlugin: VideoNode/AudioNode/FileNode not registered on editor");
    }
    const insert = (node: VideoNode | AudioNode | FileNode) => {
      $insertNodeToNearestRoot(node);
      if (node.getNextSibling() === null) node.insertAfter($createParagraphNode());
      return true;
    };
    return mergeRegister(
      editor.registerCommand(INSERT_VIDEO_COMMAND, (p) => insert($createVideoNode(p)), COMMAND_PRIORITY_EDITOR),
      editor.registerCommand(INSERT_AUDIO_COMMAND, (p) => insert($createAudioNode(p)), COMMAND_PRIORITY_EDITOR),
      editor.registerCommand(INSERT_FILE_COMMAND, (p) => insert($createFileNode(p)), COMMAND_PRIORITY_EDITOR),
    );
  }, [editor]);
  return null;
}
