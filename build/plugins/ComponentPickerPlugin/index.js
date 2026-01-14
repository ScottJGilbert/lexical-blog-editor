import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { $createCodeNode } from "@lexical/code";
import { INSERT_CHECK_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, } from "@lexical/list";
import { INSERT_EMBED_COMMAND } from "@lexical/react/LexicalAutoEmbedPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { LexicalTypeaheadMenuPlugin, MenuOption, useBasicTypeaheadTriggerMatch, } from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import { $createParagraphNode, $getSelection, $isRangeSelection, FORMAT_ELEMENT_COMMAND, } from "lexical";
import { useCallback, useMemo, useState } from "react";
import * as ReactDOM from "react-dom";
import useModal from "../../hooks/useModal";
import { EmbedConfigs } from "../AutoEmbedPlugin";
import { INSERT_COLLAPSIBLE_COMMAND } from "../CollapsiblePlugin";
import { INSERT_DATETIME_COMMAND } from "../DateTimePlugin";
import { InsertEquationDialog } from "../EquationsPlugin";
import { InsertImageDialog } from "../ImagesPlugin";
import InsertLayoutDialog from "../LayoutPlugin/InsertLayoutDialog";
import { INSERT_PAGE_BREAK } from "../PageBreakPlugin";
import { InsertTableDialog } from "../TablePlugin";
export class ComponentPickerOption extends MenuOption {
    constructor(title, options) {
        super(title);
        this.title = title;
        this.keywords = options.keywords || [];
        this.icon = options.icon;
        this.keyboardShortcut = options.keyboardShortcut;
        this.onSelect = options.onSelect.bind(this);
    }
}
export function ComponentPickerMenuItem({ index, isSelected, onClick, onMouseEnter, option, }) {
    let className = "item";
    if (isSelected) {
        className += " selected";
    }
    return (_jsxs("li", { tabIndex: -1, className: className, ref: option.setRefElement, role: "option", "aria-selected": isSelected, id: "typeahead-item-" + index, onMouseEnter: onMouseEnter, onClick: onClick, children: [option.icon, _jsx("span", { className: "text", children: option.title })] }, option.key));
}
export function getDynamicOptions(editor, queryString) {
    const options = [];
    if (queryString == null) {
        return options;
    }
    const tableMatch = queryString.match(/^([1-9]\d?)(?:x([1-9]\d?)?)?$/);
    if (tableMatch !== null) {
        const rows = tableMatch[1];
        const colOptions = tableMatch[2]
            ? [tableMatch[2]]
            : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(String);
        options.push(...colOptions.map((columns) => new ComponentPickerOption(`${rows}x${columns} Table`, {
            icon: _jsx("i", { className: "icon table" }),
            keywords: ["table"],
            onSelect: () => editor.dispatchCommand(INSERT_TABLE_COMMAND, { columns, rows }),
        })));
    }
    return options;
}
export function getBaseOptions(editor, showModal) {
    return [
        new ComponentPickerOption("Paragraph", {
            icon: _jsx("i", { className: "icon paragraph" }),
            keywords: ["normal", "paragraph", "p", "text"],
            onSelect: () => editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createParagraphNode());
                }
            }),
        }),
        ...[1, 2, 3].map((n) => new ComponentPickerOption(`Heading ${n}`, {
            icon: _jsx("i", { className: `icon h${n}` }),
            keywords: ["heading", "header", `h${n}`],
            onSelect: () => editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createHeadingNode(`h${n}`));
                }
            }),
        })),
        new ComponentPickerOption("Table", {
            icon: _jsx("i", { className: "icon table" }),
            keywords: ["table", "grid", "spreadsheet", "rows", "columns"],
            onSelect: () => showModal("Insert Table", (onClose) => (_jsx(InsertTableDialog, { activeEditor: editor, onClose: onClose }))),
        }),
        new ComponentPickerOption("Numbered List", {
            icon: _jsx("i", { className: "icon number" }),
            keywords: ["numbered list", "ordered list", "ol"],
            onSelect: () => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined),
        }),
        new ComponentPickerOption("Bulleted List", {
            icon: _jsx("i", { className: "icon bullet" }),
            keywords: ["bulleted list", "unordered list", "ul"],
            onSelect: () => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined),
        }),
        new ComponentPickerOption("Check List", {
            icon: _jsx("i", { className: "icon check" }),
            keywords: ["check list", "todo list"],
            onSelect: () => editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined),
        }),
        new ComponentPickerOption("Quote", {
            icon: _jsx("i", { className: "icon quote" }),
            keywords: ["block quote"],
            onSelect: () => editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    $setBlocksType(selection, () => $createQuoteNode());
                }
            }),
        }),
        new ComponentPickerOption("Code", {
            icon: _jsx("i", { className: "icon code" }),
            keywords: ["javascript", "python", "js", "codeblock"],
            onSelect: () => editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    if (selection.isCollapsed()) {
                        $setBlocksType(selection, () => $createCodeNode());
                    }
                    else {
                        // Will this ever happen?
                        const textContent = selection.getTextContent();
                        const codeNode = $createCodeNode();
                        selection.insertNodes([codeNode]);
                        selection.insertRawText(textContent);
                    }
                }
            }),
        }),
        new ComponentPickerOption("Divider", {
            icon: _jsx("i", { className: "icon horizontal-rule" }),
            keywords: ["horizontal rule", "divider", "hr"],
            onSelect: () => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
        }),
        new ComponentPickerOption("Page Break", {
            icon: _jsx("i", { className: "icon page-break" }),
            keywords: ["page break", "divider"],
            onSelect: () => editor.dispatchCommand(INSERT_PAGE_BREAK, undefined),
        }),
        ...EmbedConfigs.map((embedConfig) => new ComponentPickerOption(`Embed ${embedConfig.contentName}`, {
            icon: embedConfig.icon,
            keywords: [...embedConfig.keywords, "embed"],
            onSelect: () => editor.dispatchCommand(INSERT_EMBED_COMMAND, embedConfig.type),
        })),
        new ComponentPickerOption("Date", {
            icon: _jsx("i", { className: "icon calendar" }),
            keywords: ["date", "calendar", "time"],
            onSelect: () => {
                const dateTime = new Date();
                dateTime.setHours(0, 0, 0, 0); // Set time to midnight
                editor.dispatchCommand(INSERT_DATETIME_COMMAND, { dateTime });
            },
        }),
        new ComponentPickerOption("Today", {
            icon: _jsx("i", { className: "icon calendar" }),
            keywords: ["date", "calendar", "time", "today"],
            onSelect: () => {
                const dateTime = new Date();
                dateTime.setHours(0, 0, 0, 0); // Set time to midnight
                editor.dispatchCommand(INSERT_DATETIME_COMMAND, { dateTime });
            },
        }),
        new ComponentPickerOption("Tomorrow", {
            icon: _jsx("i", { className: "icon calendar" }),
            keywords: ["date", "calendar", "time", "tomorrow"],
            onSelect: () => {
                const dateTime = new Date();
                dateTime.setDate(dateTime.getDate() + 1);
                dateTime.setHours(0, 0, 0, 0); // Set time to midnight
                editor.dispatchCommand(INSERT_DATETIME_COMMAND, { dateTime });
            },
        }),
        new ComponentPickerOption("Yesterday", {
            icon: _jsx("i", { className: "icon calendar" }),
            keywords: ["date", "calendar", "time", "yesterday"],
            onSelect: () => {
                const dateTime = new Date();
                dateTime.setDate(dateTime.getDate() - 1);
                dateTime.setHours(0, 0, 0, 0); // Set time to midnight
                editor.dispatchCommand(INSERT_DATETIME_COMMAND, { dateTime });
            },
        }),
        new ComponentPickerOption("Equation", {
            icon: _jsx("i", { className: "icon equation" }),
            keywords: ["equation", "latex", "math"],
            onSelect: () => showModal("Insert Equation", (onClose) => (_jsx(InsertEquationDialog, { activeEditor: editor, onClose: onClose }))),
        }),
        new ComponentPickerOption("Image", {
            icon: _jsx("i", { className: "icon image" }),
            keywords: ["image", "photo", "picture", "file"],
            onSelect: () => showModal("Insert Image", (onClose) => (_jsx(InsertImageDialog, { activeEditor: editor, onClose: onClose }))),
        }),
        new ComponentPickerOption("Collapsible", {
            icon: _jsx("i", { className: "icon caret-right" }),
            keywords: ["collapse", "collapsible", "toggle"],
            onSelect: () => editor.dispatchCommand(INSERT_COLLAPSIBLE_COMMAND, undefined),
        }),
        new ComponentPickerOption("Columns Layout", {
            icon: _jsx("i", { className: "icon columns" }),
            keywords: ["columns", "layout", "grid"],
            onSelect: () => showModal("Insert Columns Layout", (onClose) => (_jsx(InsertLayoutDialog, { activeEditor: editor, onClose: onClose }))),
        }),
        ...["left", "center", "right", "justify"].map((alignment) => new ComponentPickerOption(`Align ${alignment}`, {
            icon: _jsx("i", { className: `icon ${alignment}-align` }),
            keywords: ["align", "justify", alignment],
            onSelect: () => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment),
        })),
    ];
}
export default function ComponentPickerMenuPlugin() {
    const [editor] = useLexicalComposerContext();
    const [modal, showModal] = useModal();
    const [queryString, setQueryString] = useState(null);
    const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("/", {
        allowWhitespace: true,
        minLength: 0,
    });
    const options = useMemo(() => {
        const baseOptions = getBaseOptions(editor, showModal);
        if (!queryString) {
            return baseOptions;
        }
        const regex = new RegExp(queryString, "i");
        return [
            ...getDynamicOptions(editor, queryString),
            ...baseOptions.filter((option) => regex.test(option.title) ||
                option.keywords.some((keyword) => regex.test(keyword))),
        ];
    }, [editor, queryString, showModal]);
    const onSelectOption = useCallback((selectedOption, nodeToRemove, closeMenu, matchingString) => {
        editor.update(() => {
            nodeToRemove === null || nodeToRemove === void 0 ? void 0 : nodeToRemove.remove();
            selectedOption.onSelect(matchingString);
            closeMenu();
        });
    }, [editor]);
    return (_jsxs(_Fragment, { children: [modal, _jsx(LexicalTypeaheadMenuPlugin, { onQueryChange: setQueryString, onSelectOption: onSelectOption, triggerFn: checkForTriggerMatch, options: options, menuRenderFn: (anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) => anchorElementRef.current && options.length
                    ? ReactDOM.createPortal(_jsx("div", { className: "typeahead-popover component-picker-menu", children: _jsx("ul", { children: options.map((option, i) => (_jsx(ComponentPickerMenuItem, { index: i, isSelected: selectedIndex === i, onClick: () => {
                                    setHighlightedIndex(i);
                                    selectOptionAndCleanUp(option);
                                }, onMouseEnter: () => {
                                    setHighlightedIndex(i);
                                }, option: option }, option.key))) }) }), anchorElementRef.current)
                    : null })] }));
}
