/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { JSX } from 'react';
import { DecoratorNode, DOMExportOutput, LexicalNode, SerializedLexicalNode, Spread, StateConfigValue, type StateValueOrUpdater } from 'lexical';
export type Options = ReadonlyArray<Option>;
export type Option = Readonly<{
    text: string;
    uid: string;
    votes: Array<string>;
}>;
export declare function createPollOption(text?: string): Option;
export type SerializedPollNode = Spread<{
    question: string;
    options: Options;
}, SerializedLexicalNode>;
declare const questionState: import("lexical").StateConfig<"question", string>;
declare const optionsState: import("lexical").StateConfig<"options", Options>;
export declare class PollNode extends DecoratorNode<JSX.Element> {
    $config(): import("lexical").StaticNodeConfigRecord<"poll", {
        extends: typeof DecoratorNode;
        importDOM: import("lexical").DOMConversionMap<HTMLElement>;
        stateConfigs: ({
            flat: true;
            stateConfig: import("lexical").StateConfig<"question", string>;
        } | {
            flat: true;
            stateConfig: import("lexical").StateConfig<"options", Options>;
        })[];
    }>;
    getQuestion(): StateConfigValue<typeof questionState>;
    setQuestion(valueOrUpdater: StateValueOrUpdater<typeof questionState>): this;
    getOptions(): StateConfigValue<typeof optionsState>;
    setOptions(valueOrUpdater: StateValueOrUpdater<typeof optionsState>): this;
    addOption(option: Option): this;
    deleteOption(option: Option): this;
    setOptionText(option: Option, text: string): this;
    toggleVote(option: Option, username: string): this;
    exportDOM(): DOMExportOutput;
    createDOM(): HTMLElement;
    updateDOM(): false;
    decorate(): JSX.Element;
}
export declare function $createPollNode(question: string, options: Options): PollNode;
export declare function $isPollNode(node: LexicalNode | null | undefined): node is PollNode;
export {};
//# sourceMappingURL=PollNode.d.ts.map