import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { $createCodeNode, $isCodeNode } from "@lexical/code";
import { editorStateFromSerializedDocument, exportFile, importFile, } from "@lexical/file";
import { $convertFromMarkdownString, $convertToMarkdownString, } from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { CONNECTED_COMMAND } from "@lexical/yjs";
import { $createTextNode, $getRoot, $isParagraphNode, CLEAR_EDITOR_COMMAND, CLEAR_HISTORY_COMMAND, COMMAND_PRIORITY_EDITOR, } from "lexical";
import { useCallback, useEffect, useState } from "react";
import { INITIAL_SETTINGS } from "../../appSettings";
import useModal from "../../hooks/useModal";
import Button from "../../ui/Button";
import { docFromHash, docToHash } from "../../utils/docSerialization";
import { PLAYGROUND_TRANSFORMERS } from "../MarkdownTransformers";
import { SPEECH_TO_TEXT_COMMAND, SUPPORT_SPEECH_RECOGNITION, } from "../SpeechToTextPlugin";
async function sendEditorState(editor) {
    const stringifiedEditorState = JSON.stringify(editor.getEditorState());
    try {
        await fetch("http://localhost:1235/setEditorState", {
            body: stringifiedEditorState,
            headers: {
                Accept: "application/json",
                "Content-type": "application/json",
            },
            method: "POST",
        });
    }
    catch (_a) {
        // NO-OP
    }
}
async function shareDoc(doc) {
    const url = new URL(window.location.toString());
    url.hash = await docToHash(doc);
    const newUrl = url.toString();
    window.history.replaceState({}, "", newUrl);
    await window.navigator.clipboard.writeText(newUrl);
}
export default function ActionsPlugin({ shouldPreserveNewLinesInMarkdown, useCollabV2, }) {
    const [editor] = useLexicalComposerContext();
    const [isEditable, setIsEditable] = useState(() => editor.isEditable());
    const [isSpeechToText, setIsSpeechToText] = useState(false);
    const [connected, setConnected] = useState(false);
    const [isEditorEmpty, setIsEditorEmpty] = useState(true);
    const [modal, showModal] = useModal();
    useEffect(() => {
        if (INITIAL_SETTINGS.isCollab) {
            return;
        }
        docFromHash(window.location.hash).then((doc) => {
            if (doc && doc.source === "Playground") {
                editor.setEditorState(editorStateFromSerializedDocument(editor, doc));
                editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
            }
        });
    }, [editor]);
    useEffect(() => {
        return mergeRegister(editor.registerEditableListener((editable) => {
            setIsEditable(editable);
        }), editor.registerCommand(CONNECTED_COMMAND, (payload) => {
            const isConnected = payload;
            setConnected(isConnected);
            return false;
        }, COMMAND_PRIORITY_EDITOR));
    }, [editor]);
    useEffect(() => {
        return editor.registerUpdateListener(({ dirtyElements, prevEditorState, tags }) => {
            editor.getEditorState().read(() => {
                const root = $getRoot();
                const children = root.getChildren();
                if (children.length > 1) {
                    setIsEditorEmpty(false);
                }
                else {
                    if ($isParagraphNode(children[0])) {
                        const paragraphChildren = children[0].getChildren();
                        setIsEditorEmpty(paragraphChildren.length === 0);
                    }
                    else {
                        setIsEditorEmpty(false);
                    }
                }
            });
        });
    }, [editor, isEditable]);
    const handleMarkdownToggle = useCallback(() => {
        editor.update(() => {
            const root = $getRoot();
            const firstChild = root.getFirstChild();
            if ($isCodeNode(firstChild) && firstChild.getLanguage() === "markdown") {
                $convertFromMarkdownString(firstChild.getTextContent(), PLAYGROUND_TRANSFORMERS, undefined, // node
                shouldPreserveNewLinesInMarkdown);
            }
            else {
                const markdown = $convertToMarkdownString(PLAYGROUND_TRANSFORMERS, undefined, //node
                shouldPreserveNewLinesInMarkdown);
                const codeNode = $createCodeNode("markdown");
                codeNode.append($createTextNode(markdown));
                root.clear().append(codeNode);
                if (markdown.length === 0) {
                    codeNode.select();
                }
            }
        });
    }, [editor, shouldPreserveNewLinesInMarkdown]);
    return (_jsxs("div", { className: "actions", children: [SUPPORT_SPEECH_RECOGNITION && (_jsx("button", { onClick: () => {
                    editor.dispatchCommand(SPEECH_TO_TEXT_COMMAND, !isSpeechToText);
                    setIsSpeechToText(!isSpeechToText);
                }, className: "action-button action-button-mic " +
                    (isSpeechToText ? "active" : ""), title: "Speech To Text", "aria-label": `${isSpeechToText ? "Enable" : "Disable"} speech to text`, children: _jsx("i", { className: "mic" }) })), _jsx("button", { className: "action-button import", onClick: () => importFile(editor), title: "Import", "aria-label": "Import editor state from JSON", children: _jsx("i", { className: "import" }) }), _jsx("button", { className: "action-button export", onClick: () => exportFile(editor, {
                    fileName: `Playground ${new Date().toISOString()}`,
                    source: "Playground",
                }), title: "Export", "aria-label": "Export editor state to JSON", children: _jsx("i", { className: "export" }) }), _jsx("button", { className: "action-button clear", disabled: isEditorEmpty, onClick: () => {
                    showModal("Clear editor", (onClose) => (_jsx(ShowClearDialog, { editor: editor, onClose: onClose })));
                }, title: "Clear", "aria-label": "Clear editor contents", children: _jsx("i", { className: "clear" }) }), _jsx("button", { className: `action-button ${!isEditable ? "unlock" : "lock"}`, onClick: () => {
                    // Send latest editor state to commenting validation server
                    if (isEditable) {
                        sendEditorState(editor);
                    }
                    editor.setEditable(!editor.isEditable());
                }, title: "Read-Only Mode", "aria-label": `${!isEditable ? "Unlock" : "Lock"} read-only mode`, children: _jsx("i", { className: !isEditable ? "unlock" : "lock" }) }), _jsx("button", { className: "action-button", onClick: handleMarkdownToggle, title: "Convert From Markdown", "aria-label": "Convert from markdown", children: _jsx("i", { className: "markdown" }) }), modal] }));
}
function ShowClearDialog({ editor, onClose, }) {
    return (_jsxs(_Fragment, { children: ["Are you sure you want to clear the editor?", _jsxs("div", { className: "Modal__content", children: [_jsx(Button, { onClick: () => {
                            editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
                            editor.focus();
                            onClose();
                        }, children: "Clear" }), " ", _jsx(Button, { onClick: () => {
                            editor.focus();
                            onClose();
                        }, children: "Cancel" })] })] }));
}
