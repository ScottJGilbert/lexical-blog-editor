import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { $isCodeNode, getCodeLanguageOptions as getCodeLanguageOptionsPrism, normalizeCodeLanguage as normalizeCodeLanguagePrism, } from "@lexical/code";
import { getCodeLanguageOptions as getCodeLanguageOptionsShiki, getCodeThemeOptions as getCodeThemeOptionsShiki, normalizeCodeLanguage as normalizeCodeLanguageShiki, } from "@lexical/code-shiki";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $isListNode, ListNode } from "@lexical/list";
import { INSERT_EMBED_COMMAND } from "@lexical/react/LexicalAutoEmbedPlugin";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { $isHeadingNode } from "@lexical/rich-text";
import { $getSelectionStyleValueForProperty, $isParentElementRTL, $patchStyleText, } from "@lexical/selection";
import { $isTableNode, $isTableSelection } from "@lexical/table";
import { $findMatchingParent, $getNearestNodeOfType, $isEditorIsNestedEditor, IS_APPLE, mergeRegister, } from "@lexical/utils";
import { $addUpdateTag, $getNodeByKey, $getSelection, $isElementNode, $isNodeSelection, $isRangeSelection, $isRootOrShadowRoot, CAN_REDO_COMMAND, CAN_UNDO_COMMAND, COMMAND_PRIORITY_CRITICAL, FORMAT_ELEMENT_COMMAND, FORMAT_TEXT_COMMAND, HISTORIC_TAG, INDENT_CONTENT_COMMAND, OUTDENT_CONTENT_COMMAND, REDO_COMMAND, SELECTION_CHANGE_COMMAND, SKIP_DOM_SELECTION_TAG, SKIP_SELECTION_FOCUS_TAG, UNDO_COMMAND, } from "lexical";
import { useCallback, useEffect, useState } from "react";
import { blockTypeToBlockName, useToolbarState, } from "../../context/ToolbarContext";
import useModal from "../../hooks/useModal";
import DropDown, { DropDownItem } from "../../ui/DropDown";
import DropdownColorPicker from "../../ui/DropdownColorPicker";
import { isKeyboardInput } from "../../utils/focusUtils";
import { getSelectedNode } from "../../utils/getSelectedNode";
import { sanitizeUrl } from "../../utils/url";
import { EmbedConfigs } from "../AutoEmbedPlugin";
import { INSERT_COLLAPSIBLE_COMMAND } from "../CollapsiblePlugin";
import { INSERT_DATETIME_COMMAND } from "../DateTimePlugin";
import { InsertEquationDialog } from "../EquationsPlugin";
import { InsertImageDialog, } from "../ImagesPlugin";
import InsertLayoutDialog from "../LayoutPlugin/InsertLayoutDialog";
import { INSERT_PAGE_BREAK } from "../PageBreakPlugin";
import { SHORTCUTS } from "../ShortcutsPlugin/shortcuts";
import { InsertTableDialog } from "../TablePlugin";
import FontSize, { parseFontSizeForToolbar } from "./fontSize";
import { clearFormatting, formatBulletList, formatCheckList, formatCode, formatHeading, formatNumberedList, formatParagraph, formatQuote, } from "./utils";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const rootTypeToRootName = {
    root: "Root",
    table: "Table",
};
const CODE_LANGUAGE_OPTIONS_PRISM = getCodeLanguageOptionsPrism().filter((option) => [
    "c",
    "clike",
    "cpp",
    "css",
    "html",
    "java",
    "js",
    "javascript",
    "markdown",
    "objc",
    "objective-c",
    "plain",
    "powershell",
    "py",
    "python",
    "rust",
    "sql",
    "swift",
    "typescript",
    "xml",
].includes(option[0]));
const CODE_LANGUAGE_OPTIONS_SHIKI = getCodeLanguageOptionsShiki().filter((option) => [
    "c",
    "clike",
    "cpp",
    "css",
    "html",
    "java",
    "js",
    "javascript",
    "markdown",
    "objc",
    "objective-c",
    "plain",
    "powershell",
    "py",
    "python",
    "rust",
    "sql",
    "typescript",
    "xml",
].includes(option[0]));
const CODE_THEME_OPTIONS_SHIKI = getCodeThemeOptionsShiki().filter((option) => [
    "catppuccin-latte",
    "everforest-light",
    "github-light",
    "gruvbox-light-medium",
    "kanagawa-lotus",
    "dark-plus",
    "light-plus",
    "material-theme-lighter",
    "min-light",
    "one-light",
    "rose-pine-dawn",
    "slack-ochin",
    "snazzy-light",
    "solarized-light",
    "vitesse-light",
].includes(option[0]));
const FONT_FAMILY_OPTIONS = [
    ["Arial", "Arial"],
    ["Courier New", "Courier New"],
    ["Georgia", "Georgia"],
    ["Times New Roman", "Times New Roman"],
    ["Trebuchet MS", "Trebuchet MS"],
    ["Verdana", "Verdana"],
];
const FONT_SIZE_OPTIONS = [
    ["10px", "10px"],
    ["11px", "11px"],
    ["12px", "12px"],
    ["13px", "13px"],
    ["14px", "14px"],
    ["15px", "15px"],
    ["16px", "16px"],
    ["17px", "17px"],
    ["18px", "18px"],
    ["19px", "19px"],
    ["20px", "20px"],
];
const ELEMENT_FORMAT_OPTIONS = {
    center: {
        icon: "center-align",
        iconRTL: "center-align",
        name: "Center Align",
    },
    end: {
        icon: "right-align",
        iconRTL: "left-align",
        name: "End Align",
    },
    justify: {
        icon: "justify-align",
        iconRTL: "justify-align",
        name: "Justify Align",
    },
    left: {
        icon: "left-align",
        iconRTL: "left-align",
        name: "Left Align",
    },
    right: {
        icon: "right-align",
        iconRTL: "right-align",
        name: "Right Align",
    },
    start: {
        icon: "left-align",
        iconRTL: "right-align",
        name: "Start Align",
    },
};
function dropDownActiveClass(active) {
    if (active) {
        return "active dropdown-item-active";
    }
    else {
        return "";
    }
}
function BlockFormatDropDown({ editor, blockType, rootType, disabled = false, }) {
    return (_jsxs(DropDown, { disabled: disabled, buttonClassName: "toolbar-item block-controls", buttonIconClassName: "icon block-type " + blockType, buttonLabel: blockTypeToBlockName[blockType], buttonAriaLabel: "Formatting options for text style", children: [_jsxs(DropDownItem, { className: "item wide " + dropDownActiveClass(blockType === "paragraph"), onClick: () => formatParagraph(editor), children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon paragraph" }), _jsx("span", { className: "text", children: "Normal" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.NORMAL })] }), _jsxs(DropDownItem, { className: "item wide " + dropDownActiveClass(blockType === "h1"), onClick: () => formatHeading(editor, blockType, "h1"), children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon h1" }), _jsx("span", { className: "text", children: "Heading 1" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.HEADING1 })] }), _jsxs(DropDownItem, { className: "item wide " + dropDownActiveClass(blockType === "h2"), onClick: () => formatHeading(editor, blockType, "h2"), children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon h2" }), _jsx("span", { className: "text", children: "Heading 2" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.HEADING2 })] }), _jsxs(DropDownItem, { className: "item wide " + dropDownActiveClass(blockType === "h3"), onClick: () => formatHeading(editor, blockType, "h3"), children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon h3" }), _jsx("span", { className: "text", children: "Heading 3" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.HEADING3 })] }), _jsxs(DropDownItem, { className: "item wide " + dropDownActiveClass(blockType === "number"), onClick: () => formatNumberedList(editor, blockType), children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon numbered-list" }), _jsx("span", { className: "text", children: "Numbered List" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.NUMBERED_LIST })] }), _jsxs(DropDownItem, { className: "item wide " + dropDownActiveClass(blockType === "bullet"), onClick: () => formatBulletList(editor, blockType), children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon bullet-list" }), _jsx("span", { className: "text", children: "Bullet List" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.BULLET_LIST })] }), _jsxs(DropDownItem, { className: "item wide " + dropDownActiveClass(blockType === "check"), onClick: () => formatCheckList(editor, blockType), children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon check-list" }), _jsx("span", { className: "text", children: "Check List" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.CHECK_LIST })] }), _jsxs(DropDownItem, { className: "item wide " + dropDownActiveClass(blockType === "quote"), onClick: () => formatQuote(editor, blockType), children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon quote" }), _jsx("span", { className: "text", children: "Quote" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.QUOTE })] }), _jsxs(DropDownItem, { className: "item wide " + dropDownActiveClass(blockType === "code"), onClick: () => formatCode(editor, blockType), children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon code" }), _jsx("span", { className: "text", children: "Code Block" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.CODE_BLOCK })] })] }));
}
function Divider() {
    return _jsx("div", { className: "divider" });
}
function FontDropDown({ editor, value, style, disabled = false, }) {
    const handleClick = useCallback((option) => {
        editor.update(() => {
            $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
            const selection = $getSelection();
            if (selection !== null) {
                $patchStyleText(selection, {
                    [style]: option,
                });
            }
        });
    }, [editor, style]);
    const buttonAriaLabel = style === "font-family"
        ? "Formatting options for font family"
        : "Formatting options for font size";
    return (_jsx(DropDown, { disabled: disabled, buttonClassName: "toolbar-item " + style, buttonLabel: value, buttonIconClassName: style === "font-family" ? "icon block-type font-family" : "", buttonAriaLabel: buttonAriaLabel, children: (style === "font-family" ? FONT_FAMILY_OPTIONS : FONT_SIZE_OPTIONS).map(([option, text]) => (_jsx(DropDownItem, { className: `item ${dropDownActiveClass(value === option)} ${style === "font-size" ? "fontsize-item" : ""}`, onClick: () => handleClick(option), children: _jsx("span", { className: "text", children: text }) }, option))) }));
}
function ElementFormatDropdown({ editor, value, isRTL, disabled = false, }) {
    const formatOption = ELEMENT_FORMAT_OPTIONS[value || "left"];
    return (_jsxs(DropDown, { disabled: disabled, buttonLabel: formatOption.name, buttonIconClassName: `icon ${isRTL ? formatOption.iconRTL : formatOption.icon}`, buttonClassName: "toolbar-item spaced alignment", buttonAriaLabel: "Formatting options for text alignment", children: [_jsxs(DropDownItem, { onClick: () => {
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left");
                }, className: "item wide", children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon left-align" }), _jsx("span", { className: "text", children: "Left Align" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.LEFT_ALIGN })] }), _jsxs(DropDownItem, { onClick: () => {
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center");
                }, className: "item wide", children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon center-align" }), _jsx("span", { className: "text", children: "Center Align" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.CENTER_ALIGN })] }), _jsxs(DropDownItem, { onClick: () => {
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right");
                }, className: "item wide", children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon right-align" }), _jsx("span", { className: "text", children: "Right Align" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.RIGHT_ALIGN })] }), _jsxs(DropDownItem, { onClick: () => {
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify");
                }, className: "item wide", children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon justify-align" }), _jsx("span", { className: "text", children: "Justify Align" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.JUSTIFY_ALIGN })] }), _jsxs(DropDownItem, { onClick: () => {
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "start");
                }, className: "item wide", children: [_jsx("i", { className: `icon ${isRTL
                            ? ELEMENT_FORMAT_OPTIONS.start.iconRTL
                            : ELEMENT_FORMAT_OPTIONS.start.icon}` }), _jsx("span", { className: "text", children: "Start Align" })] }), _jsxs(DropDownItem, { onClick: () => {
                    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "end");
                }, className: "item wide", children: [_jsx("i", { className: `icon ${isRTL
                            ? ELEMENT_FORMAT_OPTIONS.end.iconRTL
                            : ELEMENT_FORMAT_OPTIONS.end.icon}` }), _jsx("span", { className: "text", children: "End Align" })] }), _jsx(Divider, {}), _jsxs(DropDownItem, { onClick: () => {
                    editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined);
                }, className: "item wide", children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon " + (isRTL ? "indent" : "outdent") }), _jsx("span", { className: "text", children: "Outdent" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.OUTDENT })] }), _jsxs(DropDownItem, { onClick: () => {
                    editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined);
                }, className: "item wide", children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon " + (isRTL ? "outdent" : "indent") }), _jsx("span", { className: "text", children: "Indent" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.INDENT })] })] }));
}
function $findTopLevelElement(node) {
    let topLevelElement = node.getKey() === "root"
        ? node
        : $findMatchingParent(node, (e) => {
            const parent = e.getParent();
            return parent !== null && $isRootOrShadowRoot(parent);
        });
    if (topLevelElement === null) {
        topLevelElement = node.getTopLevelElementOrThrow();
    }
    return topLevelElement;
}
export default function ToolbarPlugin({ editor, activeEditor, setActiveEditor, setIsLinkEditMode, }) {
    const [selectedElementKey, setSelectedElementKey] = useState(null);
    const [modal, showModal] = useModal();
    const [isEditable, setIsEditable] = useState(() => editor.isEditable());
    const { toolbarState, updateToolbarState } = useToolbarState();
    const dispatchToolbarCommand = (command, payload = undefined, skipRefocus = false) => {
        activeEditor.update(() => {
            if (skipRefocus) {
                $addUpdateTag(SKIP_DOM_SELECTION_TAG);
            }
            // Re-assert on Type so that payload can have a default param
            activeEditor.dispatchCommand(command, payload);
        });
    };
    const dispatchFormatTextCommand = (payload, skipRefocus = false) => dispatchToolbarCommand(FORMAT_TEXT_COMMAND, payload, skipRefocus);
    const $handleHeadingNode = useCallback((selectedElement) => {
        const type = $isHeadingNode(selectedElement)
            ? selectedElement.getTag()
            : selectedElement.getType();
        if (type in blockTypeToBlockName) {
            updateToolbarState("blockType", type);
        }
    }, [updateToolbarState]);
    const $handleCodeNode = useCallback((element) => {
        if ($isCodeNode(element)) {
            const language = element.getLanguage();
            updateToolbarState("codeLanguage", language ? normalizeCodeLanguageShiki(language) || language : "");
            const theme = element.getTheme();
            updateToolbarState("codeTheme", theme || "");
            return;
        }
    }, [updateToolbarState]);
    const $updateToolbar = useCallback(() => {
        var _a;
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            if (activeEditor !== editor && $isEditorIsNestedEditor(activeEditor)) {
                const rootElement = activeEditor.getRootElement();
                updateToolbarState("isImageCaption", !!((_a = rootElement === null || rootElement === void 0 ? void 0 : rootElement.parentElement) === null || _a === void 0 ? void 0 : _a.classList.contains("image-caption-container")));
            }
            else {
                updateToolbarState("isImageCaption", false);
            }
            const anchorNode = selection.anchor.getNode();
            const element = $findTopLevelElement(anchorNode);
            const elementKey = element.getKey();
            const elementDOM = activeEditor.getElementByKey(elementKey);
            updateToolbarState("isRTL", $isParentElementRTL(selection));
            // Update links
            const node = getSelectedNode(selection);
            const parent = node.getParent();
            const isLink = $isLinkNode(parent) || $isLinkNode(node);
            updateToolbarState("isLink", isLink);
            const tableNode = $findMatchingParent(node, $isTableNode);
            if ($isTableNode(tableNode)) {
                updateToolbarState("rootType", "table");
            }
            else {
                updateToolbarState("rootType", "root");
            }
            if (elementDOM !== null) {
                setSelectedElementKey(elementKey);
                if ($isListNode(element)) {
                    const parentList = $getNearestNodeOfType(anchorNode, ListNode);
                    const type = parentList
                        ? parentList.getListType()
                        : element.getListType();
                    updateToolbarState("blockType", type);
                }
                else {
                    $handleHeadingNode(element);
                    $handleCodeNode(element);
                }
            }
            // Handle buttons
            updateToolbarState("fontColor", $getSelectionStyleValueForProperty(selection, "color", "#000"));
            updateToolbarState("bgColor", $getSelectionStyleValueForProperty(selection, "background-color", "#fff"));
            updateToolbarState("fontFamily", $getSelectionStyleValueForProperty(selection, "font-family", "Arial"));
            let matchingParent;
            if ($isLinkNode(parent)) {
                // If node is a link, we need to fetch the parent paragraph node to set format
                matchingParent = $findMatchingParent(node, (parentNode) => $isElementNode(parentNode) && !parentNode.isInline());
            }
            // If matchingParent is a valid node, pass it's format type
            updateToolbarState("elementFormat", $isElementNode(matchingParent)
                ? matchingParent.getFormatType()
                : $isElementNode(node)
                    ? node.getFormatType()
                    : (parent === null || parent === void 0 ? void 0 : parent.getFormatType()) || "left");
        }
        if ($isRangeSelection(selection) || $isTableSelection(selection)) {
            // Update text format
            updateToolbarState("isBold", selection.hasFormat("bold"));
            updateToolbarState("isItalic", selection.hasFormat("italic"));
            updateToolbarState("isUnderline", selection.hasFormat("underline"));
            updateToolbarState("isStrikethrough", selection.hasFormat("strikethrough"));
            updateToolbarState("isSubscript", selection.hasFormat("subscript"));
            updateToolbarState("isSuperscript", selection.hasFormat("superscript"));
            updateToolbarState("isHighlight", selection.hasFormat("highlight"));
            updateToolbarState("isCode", selection.hasFormat("code"));
            updateToolbarState("fontSize", $getSelectionStyleValueForProperty(selection, "font-size", "15px"));
            updateToolbarState("isLowercase", selection.hasFormat("lowercase"));
            updateToolbarState("isUppercase", selection.hasFormat("uppercase"));
            updateToolbarState("isCapitalize", selection.hasFormat("capitalize"));
        }
        if ($isNodeSelection(selection)) {
            const nodes = selection.getNodes();
            for (const selectedNode of nodes) {
                const parentList = $getNearestNodeOfType(selectedNode, ListNode);
                if (parentList) {
                    const type = parentList.getListType();
                    updateToolbarState("blockType", type);
                }
                else {
                    const selectedElement = $findTopLevelElement(selectedNode);
                    $handleHeadingNode(selectedElement);
                    $handleCodeNode(selectedElement);
                    // Update elementFormat for node selection (e.g., images)
                    if ($isElementNode(selectedElement)) {
                        updateToolbarState("elementFormat", selectedElement.getFormatType());
                    }
                }
            }
        }
    }, [
        activeEditor,
        editor,
        updateToolbarState,
        $handleHeadingNode,
        $handleCodeNode,
    ]);
    useEffect(() => {
        return editor.registerCommand(SELECTION_CHANGE_COMMAND, (_payload, newEditor) => {
            setActiveEditor(newEditor);
            $updateToolbar();
            return false;
        }, COMMAND_PRIORITY_CRITICAL);
    }, [editor, $updateToolbar, setActiveEditor]);
    useEffect(() => {
        activeEditor.getEditorState().read(() => {
            $updateToolbar();
        }, { editor: activeEditor });
    }, [activeEditor, $updateToolbar]);
    useEffect(() => {
        return mergeRegister(editor.registerEditableListener((editable) => {
            setIsEditable(editable);
        }), activeEditor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                $updateToolbar();
            }, { editor: activeEditor });
        }), activeEditor.registerCommand(CAN_UNDO_COMMAND, (payload) => {
            updateToolbarState("canUndo", payload);
            return false;
        }, COMMAND_PRIORITY_CRITICAL), activeEditor.registerCommand(CAN_REDO_COMMAND, (payload) => {
            updateToolbarState("canRedo", payload);
            return false;
        }, COMMAND_PRIORITY_CRITICAL));
    }, [$updateToolbar, activeEditor, editor, updateToolbarState]);
    const applyStyleText = useCallback((styles, skipHistoryStack, skipRefocus = false) => {
        activeEditor.update(() => {
            if (skipRefocus) {
                $addUpdateTag(SKIP_DOM_SELECTION_TAG);
            }
            const selection = $getSelection();
            if (selection !== null) {
                $patchStyleText(selection, styles);
            }
        }, skipHistoryStack ? { tag: HISTORIC_TAG } : {});
    }, [activeEditor]);
    const onFontColorSelect = useCallback((value, skipHistoryStack, skipRefocus) => {
        applyStyleText({ color: value }, skipHistoryStack, skipRefocus);
    }, [applyStyleText]);
    const onBgColorSelect = useCallback((value, skipHistoryStack, skipRefocus) => {
        applyStyleText({ "background-color": value }, skipHistoryStack, skipRefocus);
    }, [applyStyleText]);
    const insertLink = useCallback(() => {
        if (!toolbarState.isLink) {
            setIsLinkEditMode(true);
            activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, sanitizeUrl("https://"));
        }
        else {
            setIsLinkEditMode(false);
            activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        }
    }, [activeEditor, setIsLinkEditMode, toolbarState.isLink]);
    const onCodeLanguageSelect = useCallback((value) => {
        activeEditor.update(() => {
            $addUpdateTag(SKIP_SELECTION_FOCUS_TAG);
            if (selectedElementKey !== null) {
                const node = $getNodeByKey(selectedElementKey);
                if ($isCodeNode(node)) {
                    node.setLanguage(value);
                }
            }
        });
    }, [activeEditor, selectedElementKey]);
    const onCodeThemeSelect = useCallback((value) => {
        activeEditor.update(() => {
            if (selectedElementKey !== null) {
                const node = $getNodeByKey(selectedElementKey);
                if ($isCodeNode(node)) {
                    node.setTheme(value);
                }
            }
        });
    }, [activeEditor, selectedElementKey]);
    const canViewerSeeInsertDropdown = !toolbarState.isImageCaption;
    const canViewerSeeInsertCodeButton = !toolbarState.isImageCaption;
    return (_jsxs("div", { className: "toolbar", children: [_jsx("button", { disabled: !toolbarState.canUndo || !isEditable, onClick: (e) => dispatchToolbarCommand(UNDO_COMMAND, undefined, isKeyboardInput(e)), title: IS_APPLE ? "Undo (⌘Z)" : "Undo (Ctrl+Z)", type: "button", className: "toolbar-item spaced", "aria-label": "Undo", children: _jsx("i", { className: "format undo" }) }), _jsx("button", { disabled: !toolbarState.canRedo || !isEditable, onClick: (e) => dispatchToolbarCommand(REDO_COMMAND, undefined, isKeyboardInput(e)), title: IS_APPLE ? "Redo (⇧⌘Z)" : "Redo (Ctrl+Y)", type: "button", className: "toolbar-item", "aria-label": "Redo", children: _jsx("i", { className: "format redo" }) }), _jsx(Divider, {}), toolbarState.blockType in blockTypeToBlockName &&
                activeEditor === editor && (_jsxs(_Fragment, { children: [_jsx(BlockFormatDropDown, { disabled: !isEditable, blockType: toolbarState.blockType, rootType: toolbarState.rootType, editor: activeEditor }), _jsx(Divider, {})] })), toolbarState.blockType === "code" ? (_jsxs(_Fragment, { children: [_jsx(DropDown, { disabled: !isEditable, buttonClassName: "toolbar-item code-language", buttonLabel: (CODE_LANGUAGE_OPTIONS_PRISM.find((opt) => opt[0] ===
                            normalizeCodeLanguagePrism(toolbarState.codeLanguage)) || ["", ""])[1], buttonAriaLabel: "Select language", children: CODE_LANGUAGE_OPTIONS_PRISM.map(([value, name]) => {
                            return (_jsx(DropDownItem, { className: `item ${dropDownActiveClass(value === toolbarState.codeLanguage)}`, onClick: () => onCodeLanguageSelect(value), children: _jsx("span", { className: "text", children: name }) }, value));
                        }) }), _jsxs(_Fragment, { children: [_jsx(DropDown, { disabled: !isEditable, buttonClassName: "toolbar-item code-language", buttonLabel: (CODE_LANGUAGE_OPTIONS_SHIKI.find((opt) => opt[0] ===
                                    normalizeCodeLanguageShiki(toolbarState.codeLanguage)) || ["", ""])[1], buttonAriaLabel: "Select language", children: CODE_LANGUAGE_OPTIONS_SHIKI.map(([value, name]) => {
                                    return (_jsx(DropDownItem, { className: `item ${dropDownActiveClass(value === toolbarState.codeLanguage)}`, onClick: () => onCodeLanguageSelect(value), children: _jsx("span", { className: "text", children: name }) }, value));
                                }) }), _jsx(DropDown, { disabled: !isEditable, buttonClassName: "toolbar-item code-language", buttonLabel: (CODE_THEME_OPTIONS_SHIKI.find((opt) => opt[0] === toolbarState.codeTheme) || ["", ""])[1], buttonAriaLabel: "Select theme", children: CODE_THEME_OPTIONS_SHIKI.map(([value, name]) => {
                                    return (_jsx(DropDownItem, { className: `item ${dropDownActiveClass(value === toolbarState.codeTheme)}`, onClick: () => onCodeThemeSelect(value), children: _jsx("span", { className: "text", children: name }) }, value));
                                }) })] })] })) : (_jsxs(_Fragment, { children: [_jsx(FontDropDown, { disabled: !isEditable, style: "font-family", value: toolbarState.fontFamily, editor: activeEditor }), _jsx(Divider, {}), _jsx(FontSize, { selectionFontSize: parseFontSizeForToolbar(toolbarState.fontSize).slice(0, -2), editor: activeEditor, disabled: !isEditable }), _jsx(Divider, {}), _jsx("button", { disabled: !isEditable, onClick: (e) => dispatchFormatTextCommand("bold", isKeyboardInput(e)), className: "toolbar-item spaced " + (toolbarState.isBold ? "active" : ""), title: `Bold (${SHORTCUTS.BOLD})`, type: "button", "aria-label": `Format text as bold. Shortcut: ${SHORTCUTS.BOLD}`, children: _jsx("i", { className: "format bold" }) }), _jsx("button", { disabled: !isEditable, onClick: (e) => dispatchFormatTextCommand("italic", isKeyboardInput(e)), className: "toolbar-item spaced " + (toolbarState.isItalic ? "active" : ""), title: `Italic (${SHORTCUTS.ITALIC})`, type: "button", "aria-label": `Format text as italics. Shortcut: ${SHORTCUTS.ITALIC}`, children: _jsx("i", { className: "format italic" }) }), _jsx("button", { disabled: !isEditable, onClick: (e) => dispatchFormatTextCommand("underline", isKeyboardInput(e)), className: "toolbar-item spaced " +
                            (toolbarState.isUnderline ? "active" : ""), title: `Underline (${SHORTCUTS.UNDERLINE})`, type: "button", "aria-label": `Format text to underlined. Shortcut: ${SHORTCUTS.UNDERLINE}`, children: _jsx("i", { className: "format underline" }) }), canViewerSeeInsertCodeButton && (_jsx("button", { disabled: !isEditable, onClick: (e) => dispatchFormatTextCommand("code", isKeyboardInput(e)), className: "toolbar-item spaced " + (toolbarState.isCode ? "active" : ""), title: `Insert code block (${SHORTCUTS.INSERT_CODE_BLOCK})`, type: "button", "aria-label": "Insert code block", children: _jsx("i", { className: "format code" }) })), _jsx("button", { disabled: !isEditable, onClick: insertLink, className: "toolbar-item spaced " + (toolbarState.isLink ? "active" : ""), "aria-label": "Insert link", title: `Insert link (${SHORTCUTS.INSERT_LINK})`, type: "button", children: _jsx("i", { className: "format link" }) }), _jsx(DropdownColorPicker, { disabled: !isEditable, buttonClassName: "toolbar-item color-picker", buttonAriaLabel: "Formatting text color", buttonIconClassName: "icon font-color", color: toolbarState.fontColor, onChange: onFontColorSelect, title: "text color" }), _jsx(DropdownColorPicker, { disabled: !isEditable, buttonClassName: "toolbar-item color-picker", buttonAriaLabel: "Formatting background color", buttonIconClassName: "icon bg-color", color: toolbarState.bgColor, onChange: onBgColorSelect, title: "bg color" }), _jsxs(DropDown, { disabled: !isEditable, buttonClassName: "toolbar-item spaced", buttonLabel: "", buttonAriaLabel: "Formatting options for additional text styles", buttonIconClassName: "icon dropdown-more", children: [_jsxs(DropDownItem, { onClick: (e) => dispatchFormatTextCommand("lowercase", isKeyboardInput(e)), className: "item wide " + dropDownActiveClass(toolbarState.isLowercase), title: "Lowercase", "aria-label": "Format text to lowercase", children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon lowercase" }), _jsx("span", { className: "text", children: "Lowercase" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.LOWERCASE })] }), _jsxs(DropDownItem, { onClick: (e) => dispatchFormatTextCommand("uppercase", isKeyboardInput(e)), className: "item wide " + dropDownActiveClass(toolbarState.isUppercase), title: "Uppercase", "aria-label": "Format text to uppercase", children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon uppercase" }), _jsx("span", { className: "text", children: "Uppercase" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.UPPERCASE })] }), _jsxs(DropDownItem, { onClick: (e) => dispatchFormatTextCommand("capitalize", isKeyboardInput(e)), className: "item wide " + dropDownActiveClass(toolbarState.isCapitalize), title: "Capitalize", "aria-label": "Format text to capitalize", children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon capitalize" }), _jsx("span", { className: "text", children: "Capitalize" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.CAPITALIZE })] }), _jsxs(DropDownItem, { onClick: (e) => dispatchFormatTextCommand("strikethrough", isKeyboardInput(e)), className: "item wide " + dropDownActiveClass(toolbarState.isStrikethrough), title: "Strikethrough", "aria-label": "Format text with a strikethrough", children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon strikethrough" }), _jsx("span", { className: "text", children: "Strikethrough" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.STRIKETHROUGH })] }), _jsxs(DropDownItem, { onClick: (e) => dispatchFormatTextCommand("subscript", isKeyboardInput(e)), className: "item wide " + dropDownActiveClass(toolbarState.isSubscript), title: "Subscript", "aria-label": "Format text with a subscript", children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon subscript" }), _jsx("span", { className: "text", children: "Subscript" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.SUBSCRIPT })] }), _jsxs(DropDownItem, { onClick: (e) => dispatchFormatTextCommand("superscript", isKeyboardInput(e)), className: "item wide " + dropDownActiveClass(toolbarState.isSuperscript), title: "Superscript", "aria-label": "Format text with a superscript", children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon superscript" }), _jsx("span", { className: "text", children: "Superscript" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.SUPERSCRIPT })] }), _jsx(DropDownItem, { onClick: (e) => dispatchFormatTextCommand("highlight", isKeyboardInput(e)), className: "item wide " + dropDownActiveClass(toolbarState.isHighlight), title: "Highlight", "aria-label": "Format text with a highlight", children: _jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon highlight" }), _jsx("span", { className: "text", children: "Highlight" })] }) }), _jsxs(DropDownItem, { onClick: (e) => clearFormatting(activeEditor, isKeyboardInput(e)), className: "item wide", title: "Clear text formatting", "aria-label": "Clear all text formatting", children: [_jsxs("div", { className: "icon-text-container", children: [_jsx("i", { className: "icon clear" }), _jsx("span", { className: "text", children: "Clear Formatting" })] }), _jsx("span", { className: "shortcut", children: SHORTCUTS.CLEAR_FORMATTING })] })] }), canViewerSeeInsertDropdown && (_jsxs(_Fragment, { children: [_jsx(Divider, {}), _jsxs(DropDown, { disabled: !isEditable, buttonClassName: "toolbar-item spaced", buttonLabel: "Insert", buttonAriaLabel: "Insert specialized editor node", buttonIconClassName: "icon plus", children: [_jsxs(DropDownItem, { onClick: () => dispatchToolbarCommand(INSERT_HORIZONTAL_RULE_COMMAND), className: "item", children: [_jsx("i", { className: "icon horizontal-rule" }), _jsx("span", { className: "text", children: "Horizontal Rule" })] }), _jsxs(DropDownItem, { onClick: () => dispatchToolbarCommand(INSERT_PAGE_BREAK), className: "item", children: [_jsx("i", { className: "icon page-break" }), _jsx("span", { className: "text", children: "Page Break" })] }), _jsxs(DropDownItem, { onClick: () => {
                                            showModal("Insert Image", (onClose) => (_jsx(InsertImageDialog, { activeEditor: activeEditor, onClose: onClose })));
                                        }, className: "item", children: [_jsx("i", { className: "icon image" }), _jsx("span", { className: "text", children: "Image" })] }), _jsxs(DropDownItem, { onClick: () => {
                                            showModal("Insert Table", (onClose) => (_jsx(InsertTableDialog, { activeEditor: activeEditor, onClose: onClose })));
                                        }, className: "item", children: [_jsx("i", { className: "icon table" }), _jsx("span", { className: "text", children: "Table" })] }), _jsxs(DropDownItem, { onClick: () => {
                                            showModal("Insert Columns Layout", (onClose) => (_jsx(InsertLayoutDialog, { activeEditor: activeEditor, onClose: onClose })));
                                        }, className: "item", children: [_jsx("i", { className: "icon columns" }), _jsx("span", { className: "text", children: "Columns Layout" })] }), _jsxs(DropDownItem, { onClick: () => {
                                            showModal("Insert Equation", (onClose) => (_jsx(InsertEquationDialog, { activeEditor: activeEditor, onClose: onClose })));
                                        }, className: "item", children: [_jsx("i", { className: "icon equation" }), _jsx("span", { className: "text", children: "Equation" })] }), _jsxs(DropDownItem, { onClick: () => dispatchToolbarCommand(INSERT_COLLAPSIBLE_COMMAND), className: "item", children: [_jsx("i", { className: "icon caret-right" }), _jsx("span", { className: "text", children: "Collapsible container" })] }), _jsxs(DropDownItem, { onClick: () => {
                                            const dateTime = new Date();
                                            dateTime.setHours(0, 0, 0, 0);
                                            dispatchToolbarCommand(INSERT_DATETIME_COMMAND, {
                                                dateTime,
                                            });
                                        }, className: "item", children: [_jsx("i", { className: "icon calendar" }), _jsx("span", { className: "text", children: "Date" })] }), EmbedConfigs.map((embedConfig) => (_jsxs(DropDownItem, { onClick: () => dispatchToolbarCommand(INSERT_EMBED_COMMAND, embedConfig.type), className: "item", children: [embedConfig.icon, _jsx("span", { className: "text", children: embedConfig.contentName })] }, embedConfig.type)))] })] }))] })), _jsx(Divider, {}), _jsx(ElementFormatDropdown, { disabled: !isEditable, value: toolbarState.elementFormat, editor: activeEditor, isRTL: toolbarState.isRTL }), modal] }));
}
