/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { JSX } from 'react';
import 'katex/dist/katex.css';
import { LexicalCommand, LexicalEditor } from 'lexical';
type CommandPayload = {
    equation: string;
    inline: boolean;
};
export declare const INSERT_EQUATION_COMMAND: LexicalCommand<CommandPayload>;
export declare function InsertEquationDialog({ activeEditor, onClose, }: {
    activeEditor: LexicalEditor;
    onClose: () => void;
}): JSX.Element;
export default function EquationsPlugin(): JSX.Element | null;
export {};
//# sourceMappingURL=index.d.ts.map