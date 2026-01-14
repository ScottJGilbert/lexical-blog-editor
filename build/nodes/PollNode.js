import { jsx as _jsx } from "react/jsx-runtime";
import { $getState, $setState, buildImportMap, createState, DecoratorNode, } from 'lexical';
import * as React from 'react';
const PollComponent = React.lazy(() => import('./PollComponent'));
function createUID() {
    return Math.random()
        .toString(36)
        .replace(/[^a-z]+/g, '')
        .substring(0, 5);
}
export function createPollOption(text = '') {
    return {
        text,
        uid: createUID(),
        votes: [],
    };
}
function cloneOption(option, text, votes) {
    return {
        text,
        uid: option.uid,
        votes: votes || Array.from(option.votes),
    };
}
function $convertPollElement(domNode) {
    const question = domNode.getAttribute('data-lexical-poll-question');
    const options = domNode.getAttribute('data-lexical-poll-options');
    if (question !== null && options !== null) {
        const node = $createPollNode(question, JSON.parse(options));
        return { node };
    }
    return null;
}
function parseOptions(json) {
    const options = [];
    if (Array.isArray(json)) {
        for (const row of json) {
            if (row &&
                typeof row.text === 'string' &&
                typeof row.uid === 'string' &&
                Array.isArray(row.votes) &&
                row.votes.every((v) => typeof v === 'string')) {
                options.push(row);
            }
        }
    }
    return options;
}
const questionState = createState('question', {
    parse: (v) => (typeof v === 'string' ? v : ''),
});
const optionsState = createState('options', {
    isEqual: (a, b) => a.length === b.length && JSON.stringify(a) === JSON.stringify(b),
    parse: parseOptions,
});
export class PollNode extends DecoratorNode {
    $config() {
        return this.config('poll', {
            extends: DecoratorNode,
            importDOM: buildImportMap({
                span: (domNode) => domNode.getAttribute('data-lexical-poll-question') !== null
                    ? {
                        conversion: $convertPollElement,
                        priority: 2,
                    }
                    : null,
            }),
            stateConfigs: [
                { flat: true, stateConfig: questionState },
                { flat: true, stateConfig: optionsState },
            ],
        });
    }
    getQuestion() {
        return $getState(this, questionState);
    }
    setQuestion(valueOrUpdater) {
        return $setState(this, questionState, valueOrUpdater);
    }
    getOptions() {
        return $getState(this, optionsState);
    }
    setOptions(valueOrUpdater) {
        return $setState(this, optionsState, valueOrUpdater);
    }
    addOption(option) {
        return this.setOptions((options) => [...options, option]);
    }
    deleteOption(option) {
        return this.setOptions((prevOptions) => {
            const index = prevOptions.indexOf(option);
            if (index === -1) {
                return prevOptions;
            }
            const options = Array.from(prevOptions);
            options.splice(index, 1);
            return options;
        });
    }
    setOptionText(option, text) {
        return this.setOptions((prevOptions) => {
            const clonedOption = cloneOption(option, text);
            const options = Array.from(prevOptions);
            const index = options.indexOf(option);
            options[index] = clonedOption;
            return options;
        });
    }
    toggleVote(option, username) {
        return this.setOptions((prevOptions) => {
            const index = prevOptions.indexOf(option);
            if (index === -1) {
                return prevOptions;
            }
            const votes = option.votes;
            const votesClone = Array.from(votes);
            const voteIndex = votes.indexOf(username);
            if (voteIndex === -1) {
                votesClone.push(username);
            }
            else {
                votesClone.splice(voteIndex, 1);
            }
            const clonedOption = cloneOption(option, option.text, votesClone);
            const options = Array.from(prevOptions);
            options[index] = clonedOption;
            return options;
        });
    }
    exportDOM() {
        const element = document.createElement('span');
        element.setAttribute('data-lexical-poll-question', this.getQuestion());
        element.setAttribute('data-lexical-poll-options', JSON.stringify(this.getOptions()));
        return { element };
    }
    createDOM() {
        const elem = document.createElement('span');
        elem.style.display = 'inline-block';
        return elem;
    }
    updateDOM() {
        return false;
    }
    decorate() {
        return (_jsx(PollComponent, { question: this.getQuestion(), options: this.getOptions(), nodeKey: this.__key }));
    }
}
export function $createPollNode(question, options) {
    return new PollNode().setQuestion(question).setOptions(options);
}
export function $isPollNode(node) {
    return node instanceof PollNode;
}
