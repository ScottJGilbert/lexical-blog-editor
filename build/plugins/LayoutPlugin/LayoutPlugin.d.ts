/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalCommand, NodeKey } from 'lexical';
export declare const INSERT_LAYOUT_COMMAND: LexicalCommand<string>;
export declare const UPDATE_LAYOUT_COMMAND: LexicalCommand<{
    template: string;
    nodeKey: NodeKey;
}>;
export declare function LayoutPlugin(): null;
//# sourceMappingURL=LayoutPlugin.d.ts.map