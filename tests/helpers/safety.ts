/** DOM-based safety assertions. Requires DOMParser (jsdom / browser). */
const BAD_ELEMENTS = "script, style, object, embed, form, input, button, select, textarea, link, meta, base, svg, math, template, noscript";
const SAFE_SCHEMES = /^(https?|mailto|tel):/i;
const IFRAME_OK = [
  "https://www.youtube.com/embed/",
  "https://www.youtube-nocookie.com/embed/",
  "https://www.figma.com/embed",
  "https://player.vimeo.com/video/",
  "https://platform.twitter.com/",
  "https://twitframe.com/",
];

export function safetyViolations(html: string): string[] {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const problems: string[] = [];
  doc.body.querySelectorAll(BAD_ELEMENTS).forEach((el) => problems.push(`forbidden element <${el.tagName.toLowerCase()}>`));
  doc.body.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      if (name.startsWith("on")) problems.push(`event handler attribute ${name} on <${el.tagName.toLowerCase()}>`);
      if (["href", "src", "poster", "action", "formaction", "xlink:href"].includes(name)) {
        const compact = value.replace(/[\u0000- \u007f-\u009f]/g, "");
        const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(compact);
        const okData = /^data:image\/(png|jpe?g|gif|webp|avif|bmp|svg\+xml)[;,]/i.test(compact) && el.tagName === "IMG";
        if (hasScheme && !SAFE_SCHEMES.test(compact) && !okData) problems.push(`unsafe ${name}="${value}"`);
      }
      if (name === "style" && /url\s*\(|expression|behavior|position:\s*fixed|javascript/i.test(value)) {
        problems.push(`unsafe style="${value}"`);
      }
    }
    if (el.tagName === "IFRAME") {
      const src = el.getAttribute("src") ?? "";
      if (!IFRAME_OK.some((p) => src.startsWith(p))) problems.push(`iframe src not allowlisted: ${src}`);
    }
  });
  return problems;
}
