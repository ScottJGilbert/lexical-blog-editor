/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { SerializedDocument } from '@lexical/file';
export declare function docToHash(doc: SerializedDocument): Promise<string>;
export declare function docFromHash(hash: string): Promise<SerializedDocument | null>;
//# sourceMappingURL=docSerialization.d.ts.map