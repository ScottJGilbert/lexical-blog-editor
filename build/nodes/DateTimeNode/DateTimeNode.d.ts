/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { JSX } from 'react';
import { DecoratorNode, DOMExportOutput, LexicalNode, SerializedLexicalNode, Spread, StateConfigValue, StateValueOrUpdater } from 'lexical';
export type SerializedDateTimeNode = Spread<{
    dateTime?: string;
}, SerializedLexicalNode>;
declare const dateTimeState: import("lexical").StateConfig<"dateTime", Date>;
export declare class DateTimeNode extends DecoratorNode<JSX.Element> {
    $config(): import("lexical").StaticNodeConfigRecord<"datetime", {
        extends: typeof DecoratorNode;
        importDOM: import("lexical").DOMConversionMap<HTMLElement>;
        stateConfigs: {
            flat: true;
            stateConfig: import("lexical").StateConfig<"dateTime", Date>;
        }[];
    }>;
    getDateTime(): StateConfigValue<typeof dateTimeState>;
    setDateTime(valueOrUpdater: StateValueOrUpdater<typeof dateTimeState>): this;
    getTextContent(): string;
    exportDOM(): DOMExportOutput;
    createDOM(): HTMLElement;
    updateDOM(): false;
    isInline(): boolean;
    decorate(): JSX.Element;
}
export declare function $createDateTimeNode(dateTime: Date): DateTimeNode;
export declare function $isDateTimeNode(node: LexicalNode | null | undefined): node is DateTimeNode;
export {};
//# sourceMappingURL=DateTimeNode.d.ts.map