import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';
import { useCollaborationContext } from '@lexical/react/LexicalCollaborationContext';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { mergeRegister } from '@lexical/utils';
import { $getYChangeState, CLEAR_DIFF_VERSIONS_COMMAND__EXPERIMENTAL, DIFF_VERSIONS_COMMAND__EXPERIMENTAL, } from '@lexical/yjs';
import { $getNodeByKeyOrThrow, COMMAND_PRIORITY_CRITICAL, COMMAND_PRIORITY_EDITOR, createCommand, TextNode, } from 'lexical';
import { useCallback, useEffect, useState } from 'react';
import { PermanentUserData, snapshot as createSnapshot, XmlElement, } from 'yjs';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
const COLORS = [
    '#4a90e288',
    '#bd10e088',
    '#d0021b88',
    '#8b572a88',
    '#41750588',
    '#f5a62388',
];
export const SHOW_VERSIONS_COMMAND = createCommand('SHOW_VERSIONS_COMMAND');
export function VersionsPlugin({ id }) {
    const [editor] = useLexicalComposerContext();
    const { name: username, yjsDocMap } = useCollaborationContext();
    const yDoc = yjsDocMap.get(id);
    const [isDiffMode, setIsDiffMode] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [versions, setVersions] = useState([]);
    const [pudInitialised, setPudInitialised] = useState(false);
    useEffect(() => mergeRegister(editor.registerCommand(SHOW_VERSIONS_COMMAND, () => {
        setShowModal(true);
        return false;
    }, COMMAND_PRIORITY_EDITOR), editor.registerCommand(DIFF_VERSIONS_COMMAND__EXPERIMENTAL, () => {
        editor.setEditable(false);
        setIsDiffMode(true);
        return false;
    }, COMMAND_PRIORITY_CRITICAL), editor.registerCommand(CLEAR_DIFF_VERSIONS_COMMAND__EXPERIMENTAL, () => {
        editor.setEditable(true);
        setIsDiffMode(false);
        return false;
    }, COMMAND_PRIORITY_CRITICAL), editor.registerEditableListener((isEditable) => {
        if (isEditable && isDiffMode) {
            editor.dispatchCommand(CLEAR_DIFF_VERSIONS_COMMAND__EXPERIMENTAL, undefined);
        }
    })), [editor, isDiffMode]);
    useEffect(() => {
        if (pudInitialised || !yDoc) {
            return;
        }
        const root = yDoc.get('root-v2', XmlElement);
        const handleChange = (_events, transaction) => {
            if (transaction.local) {
                // User's made a local change. Register PUD mapping.
                const permanentUserData = new PermanentUserData(yDoc);
                permanentUserData.setUserMapping(yDoc, yDoc.clientID, username);
                setPudInitialised(true);
            }
        };
        root.observeDeep(handleChange);
        return () => root.unobserveDeep(handleChange);
    }, [yDoc, username, pudInitialised]);
    useEffect(() => {
        if (!isDiffMode) {
            return;
        }
        return editor.registerMutationListener(TextNode, (nodes) => {
            const userToColor = new Map();
            const getUserColor = (user) => {
                if (userToColor.has(user)) {
                    return userToColor.get(user);
                }
                const color = COLORS[userToColor.size % COLORS.length];
                userToColor.set(user, color);
                return color;
            };
            editor.getEditorState().read(() => {
                for (const [nodeKey, mutation] of nodes.entries()) {
                    if (mutation === 'destroyed') {
                        continue;
                    }
                    const node = $getNodeByKeyOrThrow(nodeKey);
                    const ychange = $getYChangeState(node);
                    const element = editor.getElementByKey(nodeKey);
                    if (!ychange || !element) {
                        continue;
                    }
                    const { type, user: changeUser } = ychange;
                    if (!changeUser) {
                        continue;
                    }
                    const color = getUserColor(changeUser);
                    switch (type) {
                        case 'removed':
                            element.style.color = color;
                            element.style.textDecoration = 'line-through';
                            break;
                        case 'added':
                            element.style.backgroundColor = color;
                            break;
                        default:
                        // no change
                    }
                }
            });
        }, { skipInitialization: true });
    }, [editor, isDiffMode]);
    const handleAddVersion = useCallback(() => {
        if (!yDoc) {
            return;
        }
        const now = Date.now();
        setVersions((prevVersions) => [
            ...prevVersions,
            {
                name: `Snapshot ${new Date(now).toLocaleString()}`,
                snapshot: createSnapshot(yDoc),
                timestamp: now,
            },
        ]);
    }, [setVersions, yDoc]);
    if (!showModal) {
        return null;
    }
    return (_jsx(VersionsModal, { versions: versions, isDiffMode: isDiffMode, onAddVersion: handleAddVersion, onClose: () => setShowModal(false) }));
}
function VersionsModal({ versions, isDiffMode, onAddVersion, onClose, }) {
    const [editor] = useLexicalComposerContext();
    const [selectedVersion, setSelectedVersion] = useState(null);
    return (_jsx(Modal, { onClose: onClose, title: "Version History", children: _jsxs("div", { className: "VersionsPlugin_Container", children: [_jsxs("div", { className: "VersionsPlugin_Header", children: [_jsx(Button, { onClick: onAddVersion, children: "+ Add snapshot" }), isDiffMode && (_jsx(Button, { onClick: () => {
                                editor.dispatchCommand(CLEAR_DIFF_VERSIONS_COMMAND__EXPERIMENTAL, undefined);
                                onClose();
                            }, children: "Exit compare view" }))] }), _jsx("div", { className: "VersionsPlugin_VersionList", children: versions.length === 0 ? (_jsx("button", { className: "VersionsPlugin_VersionItem", disabled: true, children: "Add a snapshot to get started" })) : (versions.map((version, idx) => {
                        const isSelected = selectedVersion === idx;
                        return (_jsxs("button", { onClick: () => setSelectedVersion(idx), className: `VersionsPlugin_VersionItem ${isSelected ? 'VersionsPlugin_VersionItem--selected' : ''}`, children: ["Snapshot at ", new Date(version.timestamp).toLocaleString()] }, version.name));
                    })) }), _jsx(Button, { onClick: () => {
                        editor.dispatchCommand(DIFF_VERSIONS_COMMAND__EXPERIMENTAL, {
                            prevSnapshot: versions[selectedVersion].snapshot,
                        });
                        onClose();
                    }, disabled: selectedVersion === null, className: "VersionsPlugin_CompareButton", children: "Show changes since selected version" })] }) }));
}
