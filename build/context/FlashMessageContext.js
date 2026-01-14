import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useState, } from 'react';
import FlashMessage from '../ui/FlashMessage';
const Context = createContext(undefined);
const INITIAL_STATE = {};
const DEFAULT_DURATION = 1000;
export const FlashMessageContext = ({ children, }) => {
    const [props, setProps] = useState(INITIAL_STATE);
    const showFlashMessage = useCallback((message, duration) => setProps(message ? { duration, message } : INITIAL_STATE), []);
    useEffect(() => {
        var _a;
        if (props.message) {
            const timeoutId = setTimeout(() => setProps(INITIAL_STATE), (_a = props.duration) !== null && _a !== void 0 ? _a : DEFAULT_DURATION);
            return () => clearTimeout(timeoutId);
        }
    }, [props]);
    return (_jsxs(Context.Provider, { value: showFlashMessage, children: [children, props.message && _jsx(FlashMessage, { children: props.message })] }));
};
export const useFlashMessageContext = () => {
    const ctx = useContext(Context);
    if (!ctx) {
        throw new Error('Missing FlashMessageContext');
    }
    return ctx;
};
