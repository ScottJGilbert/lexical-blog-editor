/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export declare const SHORTCUTS: Readonly<{
    NORMAL: "⌘+Opt+0" | "Ctrl+Alt+0";
    HEADING1: "⌘+Opt+1" | "Ctrl+Alt+1";
    HEADING2: "⌘+Opt+2" | "Ctrl+Alt+2";
    HEADING3: "⌘+Opt+3" | "Ctrl+Alt+3";
    NUMBERED_LIST: "⌘+Shift+7" | "Ctrl+Shift+7";
    BULLET_LIST: "⌘+Shift+8" | "Ctrl+Shift+8";
    CHECK_LIST: "⌘+Shift+9" | "Ctrl+Shift+9";
    CODE_BLOCK: "⌘+Opt+C" | "Ctrl+Alt+C";
    QUOTE: "⌃+Shift+Q" | "Ctrl+Shift+Q";
    ADD_COMMENT: "⌘+Opt+M" | "Ctrl+Alt+M";
    INCREASE_FONT_SIZE: "⌘+Shift+." | "Ctrl+Shift+.";
    DECREASE_FONT_SIZE: "⌘+Shift+," | "Ctrl+Shift+,";
    INSERT_CODE_BLOCK: "⌘+Shift+C" | "Ctrl+Shift+C";
    STRIKETHROUGH: "⌘+Shift+X" | "Ctrl+Shift+X";
    LOWERCASE: "⌃+Shift+1" | "Ctrl+Shift+1";
    UPPERCASE: "⌃+Shift+2" | "Ctrl+Shift+2";
    CAPITALIZE: "⌃+Shift+3" | "Ctrl+Shift+3";
    CENTER_ALIGN: "⌘+Shift+E" | "Ctrl+Shift+E";
    JUSTIFY_ALIGN: "⌘+Shift+J" | "Ctrl+Shift+J";
    LEFT_ALIGN: "⌘+Shift+L" | "Ctrl+Shift+L";
    RIGHT_ALIGN: "⌘+Shift+R" | "Ctrl+Shift+R";
    SUBSCRIPT: "⌘+," | "Ctrl+,";
    SUPERSCRIPT: "⌘+." | "Ctrl+.";
    INDENT: "⌘+]" | "Ctrl+]";
    OUTDENT: "⌘+[" | "Ctrl+[";
    CLEAR_FORMATTING: "⌘+\\" | "Ctrl+\\";
    REDO: "⌘+Shift+Z" | "Ctrl+Y";
    UNDO: "⌘+Z" | "Ctrl+Z";
    BOLD: "⌘+B" | "Ctrl+B";
    ITALIC: "⌘+I" | "Ctrl+I";
    UNDERLINE: "⌘+U" | "Ctrl+U";
    INSERT_LINK: "⌘+K" | "Ctrl+K";
}>;
export declare function isFormatParagraph(event: KeyboardEvent): boolean;
export declare function isFormatHeading(event: KeyboardEvent): boolean;
export declare function isFormatNumberedList(event: KeyboardEvent): boolean;
export declare function isFormatBulletList(event: KeyboardEvent): boolean;
export declare function isFormatCheckList(event: KeyboardEvent): boolean;
export declare function isFormatCode(event: KeyboardEvent): boolean;
export declare function isFormatQuote(event: KeyboardEvent): boolean;
export declare function isLowercase(event: KeyboardEvent): boolean;
export declare function isUppercase(event: KeyboardEvent): boolean;
export declare function isCapitalize(event: KeyboardEvent): boolean;
export declare function isStrikeThrough(event: KeyboardEvent): boolean;
export declare function isIndent(event: KeyboardEvent): boolean;
export declare function isOutdent(event: KeyboardEvent): boolean;
export declare function isCenterAlign(event: KeyboardEvent): boolean;
export declare function isLeftAlign(event: KeyboardEvent): boolean;
export declare function isRightAlign(event: KeyboardEvent): boolean;
export declare function isJustifyAlign(event: KeyboardEvent): boolean;
export declare function isSubscript(event: KeyboardEvent): boolean;
export declare function isSuperscript(event: KeyboardEvent): boolean;
export declare function isInsertCodeBlock(event: KeyboardEvent): boolean;
export declare function isIncreaseFontSize(event: KeyboardEvent): boolean;
export declare function isDecreaseFontSize(event: KeyboardEvent): boolean;
export declare function isClearFormatting(event: KeyboardEvent): boolean;
export declare function isInsertLink(event: KeyboardEvent): boolean;
export declare function isAddComment(event: KeyboardEvent): boolean;
//# sourceMappingURL=shortcuts.d.ts.map