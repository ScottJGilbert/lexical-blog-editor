/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { JSX } from "react";
import "./KatexEquationAlterer.css";
type Props = {
    initialEquation?: string;
    onConfirm: (equation: string, inline: boolean) => void;
};
export default function KatexEquationAlterer({ onConfirm, initialEquation, }: Props): JSX.Element;
export {};
//# sourceMappingURL=KatexEquationAlterer.d.ts.map