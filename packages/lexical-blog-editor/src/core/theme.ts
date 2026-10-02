import type { RenderTheme } from "./types";

/**
 * Default class names. They match `styles/ViewerTheme.css`, so output styled
 * by the v1 viewer stylesheet keeps working.
 */
export const defaultRenderTheme: RenderTheme = {
  code: "ViewerTheme__code",
  codeHighlight: {
    atrule: "ViewerTheme__tokenAttr",
    attr: "ViewerTheme__tokenAttr",
    boolean: "ViewerTheme__tokenProperty",
    builtin: "ViewerTheme__tokenSelector",
    cdata: "ViewerTheme__tokenComment",
    char: "ViewerTheme__tokenSelector",
    class: "ViewerTheme__tokenFunction",
    "class-name": "ViewerTheme__tokenFunction",
    comment: "ViewerTheme__tokenComment",
    constant: "ViewerTheme__tokenProperty",
    deleted: "ViewerTheme__tokenDeleted",
    doctype: "ViewerTheme__tokenComment",
    entity: "ViewerTheme__tokenOperator",
    function: "ViewerTheme__tokenFunction",
    important: "ViewerTheme__tokenVariable",
    inserted: "ViewerTheme__tokenInserted",
    keyword: "ViewerTheme__tokenAttr",
    namespace: "ViewerTheme__tokenVariable",
    number: "ViewerTheme__tokenProperty",
    operator: "ViewerTheme__tokenOperator",
    prolog: "ViewerTheme__tokenComment",
    property: "ViewerTheme__tokenProperty",
    punctuation: "ViewerTheme__tokenPunctuation",
    regex: "ViewerTheme__tokenVariable",
    selector: "ViewerTheme__tokenSelector",
    string: "ViewerTheme__tokenSelector",
    symbol: "ViewerTheme__tokenProperty",
    tag: "ViewerTheme__tokenProperty",
    unchanged: "ViewerTheme__tokenUnchanged",
    url: "ViewerTheme__tokenOperator",
    variable: "ViewerTheme__tokenVariable",
  },
  embedBlock: { base: "ViewerTheme__embedBlock" },
  file: "ViewerTheme__file",
  hashtag: "ViewerTheme__hashtag",
  heading: {
    h1: "ViewerTheme__h1",
    h2: "ViewerTheme__h2",
    h3: "ViewerTheme__h3",
    h4: "ViewerTheme__h4",
    h5: "ViewerTheme__h5",
    h6: "ViewerTheme__h6",
  },
  hr: "ViewerTheme__hr",
  image: "editor-image",
  indent: "ViewerTheme__indent",
  layoutContainer: "ViewerTheme__layoutContainer",
  layoutItem: "ViewerTheme__layoutItem",
  link: "ViewerTheme__link",
  list: {
    checklist: "ViewerTheme__checklist",
    listitem: "ViewerTheme__listItem",
    listitemChecked: "ViewerTheme__listItemChecked",
    listitemUnchecked: "ViewerTheme__listItemUnchecked",
    nested: { listitem: "ViewerTheme__nestedListItem" },
    olDepth: [
      "ViewerTheme__ol1",
      "ViewerTheme__ol2",
      "ViewerTheme__ol3",
      "ViewerTheme__ol4",
      "ViewerTheme__ol5",
    ],
    ul: "ViewerTheme__ul",
  },
  mark: "ViewerTheme__mark",
  paragraph: "ViewerTheme__paragraph",
  quote: "ViewerTheme__quote",
  specialText: "ViewerTheme__specialText",
  tab: "ViewerTheme__tabNode",
  table: "ViewerTheme__table",
  tableAlignment: {
    center: "ViewerTheme__tableAlignmentCenter",
    right: "ViewerTheme__tableAlignmentRight",
  },
  tableCell: "ViewerTheme__tableCell",
  tableCellHeader: "ViewerTheme__tableCellHeader",
  tableScrollableWrapper: "ViewerTheme__tableScrollableWrapper",
  text: {
    bold: "ViewerTheme__textBold",
    capitalize: "ViewerTheme__textCapitalize",
    code: "ViewerTheme__textCode",
    highlight: "ViewerTheme__textHighlight",
    italic: "ViewerTheme__textItalic",
    lowercase: "ViewerTheme__textLowercase",
    strikethrough: "ViewerTheme__textStrikethrough",
    subscript: "ViewerTheme__textSubscript",
    superscript: "ViewerTheme__textSuperscript",
    underline: "ViewerTheme__textUnderline",
    underlineStrikethrough: "ViewerTheme__textUnderlineStrikethrough",
    uppercase: "ViewerTheme__textUppercase",
  },
};

/** Deep-merge plain objects; arrays and primitives from `b` replace `a`. */
export function mergeTheme(a: RenderTheme, b?: RenderTheme): RenderTheme {
  if (!b) return a;
  const out: Record<string, unknown> = { ...a };
  for (const key of Object.keys(b)) {
    const next = (b as Record<string, unknown>)[key];
    const prev = out[key];
    if (
      next &&
      typeof next === "object" &&
      !Array.isArray(next) &&
      prev &&
      typeof prev === "object" &&
      !Array.isArray(prev)
    ) {
      out[key] = mergeTheme(prev as RenderTheme, next as RenderTheme);
    } else if (next !== undefined) {
      out[key] = next;
    }
  }
  return out as RenderTheme;
}
