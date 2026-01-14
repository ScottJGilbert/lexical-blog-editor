import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import './PollNode.css';
import { useCollaborationContext } from '@lexical/react/LexicalCollaborationContext';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { mergeRegister } from '@lexical/utils';
import { $getNodeByKey, $getSelection, $isNodeSelection, CLICK_COMMAND, COMMAND_PRIORITY_LOW, } from 'lexical';
import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../ui/Button';
import joinClasses from '../utils/joinClasses';
import { $isPollNode, createPollOption } from './PollNode';
function getTotalVotes(options) {
    return options.reduce((totalVotes, next) => {
        return totalVotes + next.votes.length;
    }, 0);
}
function PollOptionComponent({ option, index, options, totalVotes, withPollNode, }) {
    const { name: username } = useCollaborationContext();
    const checkboxRef = useRef(null);
    const votesArray = option.votes;
    const checkedIndex = votesArray.indexOf(username);
    const checked = checkedIndex !== -1;
    const votes = votesArray.length;
    const text = option.text;
    return (_jsxs("div", { className: "PollNode__optionContainer", children: [_jsx("div", { className: joinClasses('PollNode__optionCheckboxWrapper', checked && 'PollNode__optionCheckboxChecked'), children: _jsx("input", { ref: checkboxRef, className: "PollNode__optionCheckbox", type: "checkbox", onChange: (e) => {
                        withPollNode((node) => {
                            node.toggleVote(option, username);
                        });
                    }, checked: checked }) }), _jsxs("div", { className: "PollNode__optionInputWrapper", children: [_jsx("div", { className: "PollNode__optionInputVotes", style: { width: `${votes === 0 ? 0 : (votes / totalVotes) * 100}%` } }), _jsx("span", { className: "PollNode__optionInputVotesCount", children: votes > 0 && (votes === 1 ? '1 vote' : `${votes} votes`) }), _jsx("input", { className: "PollNode__optionInput", type: "text", value: text, onChange: (e) => {
                            const target = e.target;
                            const value = target.value;
                            const selectionStart = target.selectionStart;
                            const selectionEnd = target.selectionEnd;
                            withPollNode((node) => {
                                node.setOptionText(option, value);
                            }, () => {
                                target.selectionStart = selectionStart;
                                target.selectionEnd = selectionEnd;
                            });
                        }, placeholder: `Option ${index + 1}` })] }), _jsx("button", { disabled: options.length < 3, className: joinClasses('PollNode__optionDelete', options.length < 3 && 'PollNode__optionDeleteDisabled'), "aria-label": "Remove", onClick: () => {
                    withPollNode((node) => {
                        node.deleteOption(option);
                    });
                } })] }));
}
export default function PollComponent({ question, options, nodeKey, }) {
    const [editor] = useLexicalComposerContext();
    const totalVotes = useMemo(() => getTotalVotes(options), [options]);
    const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
    const [selection, setSelection] = useState(null);
    const ref = useRef(null);
    useEffect(() => {
        return mergeRegister(editor.registerUpdateListener(({ editorState }) => {
            setSelection(editorState.read(() => $getSelection()));
        }), editor.registerCommand(CLICK_COMMAND, (payload) => {
            const event = payload;
            if (event.target === ref.current) {
                if (!event.shiftKey) {
                    clearSelection();
                }
                setSelected(!isSelected);
                return true;
            }
            return false;
        }, COMMAND_PRIORITY_LOW));
    }, [clearSelection, editor, isSelected, nodeKey, setSelected]);
    const withPollNode = (cb, onUpdate) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            if ($isPollNode(node)) {
                cb(node);
            }
        }, { onUpdate });
    };
    const addOption = () => {
        withPollNode((node) => {
            node.addOption(createPollOption());
        });
    };
    const isFocused = $isNodeSelection(selection) && isSelected;
    return (_jsx("div", { className: `PollNode__container ${isFocused ? 'focused' : ''}`, ref: ref, children: _jsxs("div", { className: "PollNode__inner", children: [_jsx("h2", { className: "PollNode__heading", children: question }), options.map((option, index) => {
                    const key = option.uid;
                    return (_jsx(PollOptionComponent, { withPollNode: withPollNode, option: option, index: index, options: options, totalVotes: totalVotes }, key));
                }), _jsx("div", { className: "PollNode__footer", children: _jsx(Button, { onClick: addOption, small: true, children: "Add Option" }) })] }) }));
}
