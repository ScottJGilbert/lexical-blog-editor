import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { AutoEmbedOption, LexicalAutoEmbedPlugin, URL_MATCHER, } from '@lexical/react/LexicalAutoEmbedPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useMemo, useState } from 'react';
import * as ReactDOM from 'react-dom';
import useModal from '../../hooks/useModal';
import Button from '../../ui/Button';
import { DialogActions } from '../../ui/Dialog';
import { INSERT_FIGMA_COMMAND } from '../FigmaPlugin';
import { INSERT_TWEET_COMMAND } from '../TwitterPlugin';
import { INSERT_YOUTUBE_COMMAND } from '../YouTubePlugin';
export const YoutubeEmbedConfig = {
    contentName: 'Youtube Video',
    exampleUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    // Icon for display.
    icon: _jsx("i", { className: "icon youtube" }),
    insertNode: (editor, result) => {
        editor.dispatchCommand(INSERT_YOUTUBE_COMMAND, result.id);
    },
    keywords: ['youtube', 'video'],
    // Determine if a given URL is a match and return url data.
    parseUrl: async (url) => {
        const match = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/.exec(url);
        const id = match ? ((match === null || match === void 0 ? void 0 : match[2].length) === 11 ? match[2] : null) : null;
        if (id != null) {
            return {
                id,
                url,
            };
        }
        return null;
    },
    type: 'youtube-video',
};
export const TwitterEmbedConfig = {
    // e.g. Tweet or Google Map.
    contentName: 'X(Tweet)',
    exampleUrl: 'https://x.com/jack/status/20',
    // Icon for display.
    icon: _jsx("i", { className: "icon x" }),
    // Create the Lexical embed node from the url data.
    insertNode: (editor, result) => {
        editor.dispatchCommand(INSERT_TWEET_COMMAND, result.id);
    },
    // For extra searching.
    keywords: ['tweet', 'twitter', 'x'],
    // Determine if a given URL is a match and return url data.
    parseUrl: (text) => {
        const match = /^https:\/\/(twitter|x)\.com\/(#!\/)?(\w+)\/status(es)*\/(\d+)/.exec(text);
        if (match != null) {
            return {
                id: match[5],
                url: match[1],
            };
        }
        return null;
    },
    type: 'tweet',
};
export const FigmaEmbedConfig = {
    contentName: 'Figma Document',
    exampleUrl: 'https://www.figma.com/file/LKQ4FJ4bTnCSjedbRpk931/Sample-File',
    icon: _jsx("i", { className: "icon figma" }),
    insertNode: (editor, result) => {
        editor.dispatchCommand(INSERT_FIGMA_COMMAND, result.id);
    },
    keywords: ['figma', 'figma.com', 'mock-up'],
    // Determine if a given URL is a match and return url data.
    parseUrl: (text) => {
        const match = /https:\/\/([\w.-]+\.)?figma.com\/(file|proto)\/([0-9a-zA-Z]{22,128})(?:\/.*)?$/.exec(text);
        if (match != null) {
            return {
                id: match[3],
                url: match[0],
            };
        }
        return null;
    },
    type: 'figma',
};
export const EmbedConfigs = [
    TwitterEmbedConfig,
    YoutubeEmbedConfig,
    FigmaEmbedConfig,
];
function AutoEmbedMenuItem({ index, isSelected, onClick, onMouseEnter, option, }) {
    let className = 'item';
    if (isSelected) {
        className += ' selected';
    }
    return (_jsx("li", { tabIndex: -1, className: className, ref: option.setRefElement, role: "option", "aria-selected": isSelected, id: 'typeahead-item-' + index, onMouseEnter: onMouseEnter, onClick: onClick, children: _jsx("span", { className: "text", children: option.title }) }, option.key));
}
function AutoEmbedMenu({ options, selectedItemIndex, onOptionClick, onOptionMouseEnter, }) {
    return (_jsx("div", { className: "typeahead-popover", children: _jsx("ul", { children: options.map((option, i) => (_jsx(AutoEmbedMenuItem, { index: i, isSelected: selectedItemIndex === i, onClick: () => onOptionClick(option, i), onMouseEnter: () => onOptionMouseEnter(i), option: option }, option.key))) }) }));
}
const debounce = (callback, delay) => {
    let timeoutId;
    return (text) => {
        window.clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => {
            callback(text);
        }, delay);
    };
};
export function AutoEmbedDialog({ embedConfig, onClose, }) {
    const [text, setText] = useState('');
    const [editor] = useLexicalComposerContext();
    const [embedResult, setEmbedResult] = useState(null);
    const validateText = useMemo(() => debounce((inputText) => {
        const urlMatch = URL_MATCHER.exec(inputText);
        if (embedConfig != null && inputText != null && urlMatch != null) {
            Promise.resolve(embedConfig.parseUrl(inputText)).then((parseResult) => {
                setEmbedResult(parseResult);
            });
        }
        else if (embedResult != null) {
            setEmbedResult(null);
        }
    }, 200), [embedConfig, embedResult]);
    const onClick = () => {
        if (embedResult != null) {
            embedConfig.insertNode(editor, embedResult);
            onClose();
        }
    };
    return (_jsxs("div", { style: { width: '600px' }, children: [_jsx("div", { className: "Input__wrapper", children: _jsx("input", { type: "text", className: "Input__input", placeholder: embedConfig.exampleUrl, value: text, "data-test-id": `${embedConfig.type}-embed-modal-url`, onChange: (e) => {
                        const { value } = e.target;
                        setText(value);
                        validateText(value);
                    } }) }), _jsx(DialogActions, { children: _jsx(Button, { disabled: !embedResult, onClick: onClick, "data-test-id": `${embedConfig.type}-embed-modal-submit-btn`, children: "Embed" }) })] }));
}
export default function AutoEmbedPlugin() {
    const [modal, showModal] = useModal();
    const openEmbedModal = (embedConfig) => {
        showModal(`Embed ${embedConfig.contentName}`, (onClose) => (_jsx(AutoEmbedDialog, { embedConfig: embedConfig, onClose: onClose })));
    };
    const getMenuOptions = (activeEmbedConfig, embedFn, dismissFn) => {
        return [
            new AutoEmbedOption('Dismiss', {
                onSelect: dismissFn,
            }),
            new AutoEmbedOption(`Embed ${activeEmbedConfig.contentName}`, {
                onSelect: embedFn,
            }),
        ];
    };
    return (_jsxs(_Fragment, { children: [modal, _jsx(LexicalAutoEmbedPlugin, { embedConfigs: EmbedConfigs, onOpenEmbedModalForConfig: openEmbedModal, getMenuOptions: getMenuOptions, menuRenderFn: (anchorElementRef, { selectedIndex, options, selectOptionAndCleanUp, setHighlightedIndex }) => anchorElementRef.current
                    ? ReactDOM.createPortal(_jsx("div", { className: "typeahead-popover auto-embed-menu", style: {
                            marginLeft: `${Math.max(parseFloat(anchorElementRef.current.style.width) - 200, 0)}px`,
                            width: 200,
                        }, children: _jsx(AutoEmbedMenu, { options: options, selectedItemIndex: selectedIndex, onOptionClick: (option, index) => {
                                setHighlightedIndex(index);
                                selectOptionAndCleanUp(option);
                            }, onOptionMouseEnter: (index) => {
                                setHighlightedIndex(index);
                            } }) }), anchorElementRef.current)
                    : null })] }));
}
