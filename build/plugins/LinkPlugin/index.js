import { jsx as _jsx } from "react/jsx-runtime";
import { LinkPlugin as LexicalLinkPlugin } from "@lexical/react/LexicalLinkPlugin";
export default function LinkPlugin({ hasLinkAttributes = false, }) {
    return (_jsx(LexicalLinkPlugin, { attributes: hasLinkAttributes
            ? {
                rel: "noopener noreferrer",
                target: "_blank",
            }
            : undefined }));
}
