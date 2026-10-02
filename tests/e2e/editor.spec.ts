import { expect, test } from "@playwright/test";
import { editorBox, events, insertFromToolbar, open, savedState, type, png, mp4, pdf, pasteFile, toBase64 } from "./helpers";

test.describe("editor basics", () => {
  test("typing updates the JSON and both viewers", async ({ page }) => {
    await open(page);
    await editorBox(page).click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Hello e2e world");

    await expect(page.locator("#viewer-react")).toContainText("Hello e2e world");
    await expect(page.locator("#viewer-html")).toContainText("Hello e2e world");
    expect(await savedState(page)).toContain("Hello e2e world");
  });

  test("React viewer, HTML viewer and the string renderer agree on the same state", async ({ page }) => {
    await open(page);
    await editorBox(page).click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Agree");
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("ControlOrMeta+B");
    await expect(page.locator("#viewer-react strong")).toHaveText("Agree");

    const result = await page.evaluate(() => {
      const norm = (html: string) => {
        const d = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
        d.querySelectorAll("*").forEach((el) => {
          const style = el.getAttribute("style");
          if (style) el.setAttribute("style", style.split(";").map((s) => s.trim()).filter(Boolean).sort().join("; "));
        });
        return d.body.innerHTML;
      };
      return {
        react: norm(document.querySelector("#viewer-react > div")!.innerHTML),
        html: norm(document.querySelector("#viewer-html")!.innerHTML),
        string: norm(window.__renderToHtml(window.__state)),
      };
    });
    expect(result.html).toBe(result.string);
    expect(result.react).toBe(result.string);
  });

  test("formatting shortcuts produce the expected markup", async ({ page }) => {
    await open(page);
    await editorBox(page).click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("x");
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("ControlOrMeta+B");
    await page.keyboard.press("ControlOrMeta+I");
    await expect(page.locator("#viewer-html i > b > strong")).toHaveText("x");
  });

  test("markdown shortcuts and headings", async ({ page }) => {
    await open(page);
    await editorBox(page).click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("## Section title");
    await expect(page.locator("#viewer-html h2")).toHaveText("Section title");
  });

  test("state survives a reload through initialState", async ({ page }) => {
    await open(page);
    await editorBox(page).click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("Persist me");
    await expect(page.locator("#viewer-html")).toContainText("Persist me");
    await page.reload();
    await page.goto("/?restore=1");
    await expect(editorBox(page)).toContainText("Persist me");
  });
});

test.describe("extensions", () => {
  test("a plain Lexical extension is installed through lexicalExtensions", async ({ page }) => {
    await open(page);
    expect(await page.evaluate(() => window.__lexicalExtReady)).toBe(true);
  });

  test("a downstream editor extension adds a slash-menu entry", async ({ page }) => {
    await open(page);
    await editorBox(page).click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("/hello");
    await page.locator(".component-picker-menu .item", { hasText: "Hello Extension" }).click();
    await expect(editorBox(page)).toContainText("Hello from extension");
  });

  test("a downstream editor extension adds a toolbar Insert entry", async ({ page }) => {
    await open(page);
    await editorBox(page).click();
    await insertFromToolbar(page, "Hello Insert");
    await expect(editorBox(page)).toContainText("Inserted via menu");
  });

  test("the callout extension package: slash menu -> editor -> every viewer", async ({ page }) => {
    await open(page);
    await editorBox(page).click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("/warning");
    await page.locator(".component-picker-menu .item", { hasText: "Warning Callout" }).click();
    await page.keyboard.type("Mind the gap");

    await expect(editorBox(page).locator("aside.Callout--warning")).toContainText("Mind the gap");
    await expect(page.locator("#viewer-react aside.Callout--warning")).toContainText("Mind the gap");
    await expect(page.locator("#viewer-html aside.Callout--warning")).toContainText("Mind the gap");
    expect(await savedState(page)).toContain('"type":"callout"');
  });

  test("equations render with the KaTeX render extension", async ({ page }) => {
    await open(page);
    await page.evaluate(() => {
      window.__setViewerState(JSON.stringify({
        root: { type: "root", version: 1, format: "", indent: 0, direction: null, children: [
          { type: "paragraph", version: 1, format: "", indent: 0, direction: null, children: [{ type: "equation", version: 1, equation: "E=mc^2", inline: true }] },
        ] },
      }));
    });
    await expect(page.locator("#viewer-react .katex")).toBeVisible();
    await expect(page.locator("#viewer-html .katex")).toBeVisible();
  });
});

test.describe("media uploads", () => {
  test("toolbar: Insert > Image > File uploads via onUpload and emits events", async ({ page }) => {
    await open(page);
    await editorBox(page).click();
    await insertFromToolbar(page, "Image");
    await page.locator('[data-test-id="image-modal-option-file"]').click();
    await page.locator('[data-test-id="image-modal-file-upload"]').setInputFiles(png("pixel.png"));
    await page.locator('[data-test-id="image-modal-alt-text-input"]').fill("A pixel");
    await page.locator('[data-test-id="image-modal-file-upload-btn"]').click();

    await expect(page.locator("#viewer-html img")).toHaveAttribute("src", /\/uploads\/\d+-pixel\.png/);
    await expect(page.locator("#viewer-html img")).toHaveAttribute("alt", "A pixel");
    expect(await events(page)).toEqual(["start:image", "progress:image", "progress:image", "success:image"]);
    expect(await savedState(page)).not.toContain("upload-placeholder");
    // The uploaded URL really serves the file.
    const src = await page.locator("#viewer-html img").getAttribute("src");
    const res = await page.request.get(src!);
    expect(res.headers()["content-type"]).toBe("image/png");
  });

  test("a pasted image is uploaded", async ({ page }) => {
    await open(page);
    await pasteFile(page, { name: "pasted.png", mimeType: "image/png", base64: toBase64(png()) });
    await expect(page.locator("#viewer-html img")).toHaveAttribute("src", /pasted\.png/);
    expect(await events(page)).toContain("success:image");
  });

  test("a placeholder with progress shows while the upload is in flight", async ({ page }) => {
    await open(page, "?delay=1500");
    await pasteFile(page, { name: "slow.png", mimeType: "image/png", base64: toBase64(png()) });
    const placeholder = page.locator(".LexicalBlogEditor__uploadPlaceholder");
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText("slow.png");
    await expect(placeholder).toContainText("50%");
    // Saving mid-upload never leaks the placeholder into the rendered output.
    await expect(page.locator("#viewer-html")).not.toContainText("slow.png");
    await expect(placeholder).toBeHidden({ timeout: 8000 });
    await expect(page.locator("#viewer-html img")).toBeVisible();
  });

  test("cancelling removes the placeholder and emits abort", async ({ page }) => {
    await open(page, "?delay=5000");
    await pasteFile(page, { name: "cancel.png", mimeType: "image/png", base64: toBase64(png()) });
    await page.locator(".LexicalBlogEditor__uploadCancel").click();
    await expect(page.locator(".LexicalBlogEditor__uploadPlaceholder")).toHaveCount(0);
    await expect(page.locator("#viewer-html img")).toHaveCount(0);
    expect(await events(page)).toEqual(["start:image", "progress:image", "abort:image"]);
  });

  test("deleting the placeholder cancels its upload", async ({ page }) => {
    await open(page, "?delay=5000");
    await pasteFile(page, { name: "gone.png", mimeType: "image/png", base64: toBase64(png()) });
    await expect(page.locator(".LexicalBlogEditor__uploadPlaceholder")).toBeVisible();
    await editorBox(page).click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Backspace");
    await expect.poll(() => events(page)).toContain("abort:image");
    await expect(page.locator("#viewer-html img")).toHaveCount(0);
  });

  test("a failing upload removes the placeholder and reports the error", async ({ page }) => {
    await open(page, "?fail=1");
    await pasteFile(page, { name: "bad.png", mimeType: "image/png", base64: toBase64(png()) });
    await expect.poll(() => events(page)).toContain("error:image");
    await expect(page.locator(".LexicalBlogEditor__uploadPlaceholder")).toHaveCount(0);
    await expect(page.locator("#viewer-html img")).toHaveCount(0);
    const err = await page.evaluate(() => (window.__events.at(-1) as any).error.message);
    expect(err).toContain("500");
  });

  test("video and generic files become video / attachment blocks", async ({ page }) => {
    await open(page);
    await pasteFile(page, { name: "clip.mp4", mimeType: "video/mp4", base64: toBase64(mp4()) });
    await expect(page.locator("#viewer-html video")).toHaveAttribute("src", /clip\.mp4/);
    await expect(editorBox(page).locator("video")).toHaveCount(1);

    await pasteFile(page, { name: "report.pdf", mimeType: "application/pdf", base64: toBase64(pdf()) });
    await expect(page.locator('#viewer-html [data-lexical-file] a[download="report.pdf"]')).toBeVisible();
    expect(await events(page)).toEqual(expect.arrayContaining(["success:video", "success:file"]));
    expect(await savedState(page)).toContain('"type":"video"');
  });

  test("slash menu: Video > URL inserts a video block", async ({ page }) => {
    await open(page);
    await editorBox(page).click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("/video");
    await page.locator(".component-picker-menu .item", { hasText: /^Video$/ }).click();
    await page.locator('[data-test-id="video-modal-option-url"]').click();
    await page.locator('[data-test-id="video-modal-url-input"]').fill("https://cdn.example/v.mp4");
    await page.locator('[data-test-id="video-modal-confirm-btn"]').click();
    await expect(page.locator("#viewer-html video")).toHaveAttribute("src", "https://cdn.example/v.mp4");
  });

  test("without an onUpload handler images are inlined, other media is rejected", async ({ page }) => {
    await open(page, "?mode=no-handler");
    await pasteFile(page, { name: "inline.png", mimeType: "image/png", base64: toBase64(png()) });
    await expect(page.locator("#viewer-html img")).toHaveAttribute("src", /^data:image\/png;base64,/);

    await pasteFile(page, { name: "clip.mp4", mimeType: "video/mp4", base64: toBase64(mp4()) });
    await expect.poll(() => page.evaluate(() => window.__events.map((e: any) => e.reason ?? e.type))).toContain("no-handler");
    await expect(page.locator("#viewer-html video")).toHaveCount(0);
  });

  test("kinds and size limits are enforced", async ({ page }) => {
    await open(page, "?mode=images-only");
    await pasteFile(page, { name: "clip.mp4", mimeType: "video/mp4", base64: toBase64(mp4()) });
    await expect.poll(() => page.evaluate(() => window.__events.map((e: any) => e.reason ?? e.type))).toContain("type-not-accepted");

    await open(page, "?mode=small");
    await pasteFile(page, { name: "big.png", mimeType: "image/png", base64: Buffer.alloc(500, 1).toString("base64") });
    await expect.poll(() => page.evaluate(() => window.__events.map((e: any) => e.reason ?? e.type))).toContain("too-large");
  });

  test("the toolbar hides media kinds that are disabled", async ({ page }) => {
    await open(page, "?mode=images-only");
    await page.locator('button[aria-label="Insert specialized editor node"]').click();
    await expect(page.locator(".dropdown .item", { hasText: /^\s*Image\s*$/ })).toBeVisible();
    await expect(page.locator(".dropdown .item", { hasText: /^\s*Video\s*$/ })).toHaveCount(0);
  });

  test("UPLOAD_MEDIA_COMMAND drives uploads from app code (custom UI)", async ({ page }) => {
    await open(page);
    await page.evaluate(({ base64 }) => {
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      window.__uploadFiles([new File([bytes], "api.png", { type: "image/png" })], "From the API");
    }, { base64: toBase64(png()) });
    await expect(page.locator("#viewer-html img")).toHaveAttribute("src", /api\.png/);
    await expect(page.locator("#viewer-html img")).toHaveAttribute("alt", "From the API");
  });
});

test.describe("security", () => {
  const hostile = JSON.stringify({
    root: { type: "root", version: 1, format: "", indent: 0, direction: null, children: [
      { type: "paragraph", version: 1, format: "", indent: 0, direction: null, children: [
        { type: "link", version: 1, url: "javascript:window.__xss=true", children: [{ type: "text", version: 1, text: "click", format: 0, style: "", mode: "normal", detail: 0 }], format: "", indent: 0, direction: null },
        { type: "image", version: 1, src: "x", altText: '"><img src=x onerror="window.__xss=true">', width: 1, height: 1, maxWidth: 1, showCaption: false, caption: { editorState: null } },
        { type: "text", version: 1, text: "<img src=x onerror=\"window.__xss=true\"><script>window.__xss=true</script>", format: 0, style: "", mode: "normal", detail: 0 },
      ] },
    ] },
  });

  test("hostile state cannot execute script in any viewer", async ({ page }) => {
    await open(page);
    await page.evaluate((json) => window.__setViewerState(json), hostile);
    await expect(page.locator("#viewer-html")).toContainText("click");
    await page.locator("#viewer-html a").click({ trial: true }).catch(() => {});
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__xss)).toBe(false);
    for (const sel of ["#viewer-react", "#viewer-html"]) {
      expect(await page.locator(`${sel} script`).count()).toBe(0);
      expect(await page.locator(`${sel} [onerror]`).count()).toBe(0);
      expect(await page.locator(`${sel} a[href^="javascript"]`).count()).toBe(0);
    }
  });
});
