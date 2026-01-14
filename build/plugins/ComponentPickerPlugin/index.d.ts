/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { JSX } from "react";
import { MenuOption } from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { LexicalEditor } from "lexical";
import useModal from "../../hooks/useModal";
export declare class ComponentPickerOption extends MenuOption {
    title: string;
    icon?: JSX.Element;
    keywords: Array<string>;
    keyboardShortcut?: string;
    onSelect: (queryString: string) => void;
    constructor(title: string, options: {
        icon?: JSX.Element;
        keywords?: Array<string>;
        keyboardShortcut?: string;
        onSelect: (queryString: string) => void;
    });
}
export declare function ComponentPickerMenuItem({ index, isSelected, onClick, onMouseEnter, option, }: {
    index: number;
    isSelected: boolean;
    onClick: () => void;
    onMouseEnter: () => void;
    option: ComponentPickerOption;
}): import("react/jsx-runtime").JSX.Element;
export declare function getDynamicOptions(editor: LexicalEditor, queryString: string): ComponentPickerOption[];
export type ShowModal = ReturnType<typeof useModal>[1];
export declare function getBaseOptions(editor: LexicalEditor, showModal: ShowModal): ComponentPickerOption[];
export default function ComponentPickerMenuPlugin(): JSX.Element;
//# sourceMappingURL=index.d.ts.map