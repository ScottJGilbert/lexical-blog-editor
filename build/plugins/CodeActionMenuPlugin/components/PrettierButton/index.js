import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import './index.css';
import { $isCodeNode } from '@lexical/code';
import { $getNearestNodeFromDOMNode } from 'lexical';
import { useState } from 'react';
const PRETTIER_PARSER_MODULES = {
    css: [() => import('prettier/parser-postcss')],
    html: [() => import('prettier/parser-html')],
    js: [
        () => import('prettier/parser-babel'),
        () => import('prettier/plugins/estree'),
    ],
    markdown: [() => import('prettier/parser-markdown')],
    typescript: [
        () => import('prettier/parser-typescript'),
        () => import('prettier/plugins/estree'),
    ],
};
async function loadPrettierParserByLang(lang) {
    const dynamicImports = PRETTIER_PARSER_MODULES[lang];
    const modules = await Promise.all(dynamicImports.map((dynamicImport) => dynamicImport()));
    return modules;
}
async function loadPrettierFormat() {
    const { format } = await import('prettier/standalone');
    return format;
}
const PRETTIER_OPTIONS_BY_LANG = {
    css: { parser: 'css' },
    html: { parser: 'html' },
    js: { parser: 'babel' },
    markdown: { parser: 'markdown' },
    typescript: { parser: 'typescript' },
};
const LANG_CAN_BE_PRETTIER = Object.keys(PRETTIER_OPTIONS_BY_LANG);
export function canBePrettier(lang) {
    return LANG_CAN_BE_PRETTIER.includes(lang);
}
function getPrettierOptions(lang) {
    const options = PRETTIER_OPTIONS_BY_LANG[lang];
    if (!options) {
        throw new Error(`CodeActionMenuPlugin: Prettier does not support this language: ${lang}`);
    }
    return options;
}
export function PrettierButton({ lang, editor, getCodeDOMNode }) {
    const [syntaxError, setSyntaxError] = useState('');
    const [tipsVisible, setTipsVisible] = useState(false);
    async function handleClick() {
        const codeDOMNode = getCodeDOMNode();
        if (!codeDOMNode) {
            return;
        }
        let content = '';
        editor.update(() => {
            const codeNode = $getNearestNodeFromDOMNode(codeDOMNode);
            if ($isCodeNode(codeNode)) {
                content = codeNode.getTextContent();
            }
        });
        if (content === '') {
            return;
        }
        try {
            const format = await loadPrettierFormat();
            const options = getPrettierOptions(lang);
            const prettierParsers = await loadPrettierParserByLang(lang);
            options.plugins = prettierParsers.map((parser) => parser.default || parser);
            const formattedCode = await format(content, options);
            editor.update(() => {
                const codeNode = $getNearestNodeFromDOMNode(codeDOMNode);
                if ($isCodeNode(codeNode)) {
                    const selection = codeNode.select(0);
                    selection.insertText(formattedCode);
                    setSyntaxError('');
                    setTipsVisible(false);
                }
            });
        }
        catch (error) {
            setError(error);
        }
    }
    function setError(error) {
        if (error instanceof Error) {
            setSyntaxError(error.message);
            setTipsVisible(true);
        }
        else {
            console.error('Unexpected error: ', error);
        }
    }
    function handleMouseEnter() {
        if (syntaxError !== '') {
            setTipsVisible(true);
        }
    }
    function handleMouseLeave() {
        if (syntaxError !== '') {
            setTipsVisible(false);
        }
    }
    return (_jsxs("div", { className: "prettier-wrapper", children: [_jsx("button", { className: "menu-item", onClick: handleClick, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, "aria-label": "prettier", children: syntaxError ? (_jsx("i", { className: "format prettier-error" })) : (_jsx("i", { className: "format prettier" })) }), tipsVisible ? (_jsx("pre", { className: "code-error-tips", children: syntaxError })) : null] }));
}
