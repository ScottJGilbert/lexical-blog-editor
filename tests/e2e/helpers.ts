import { expect, type Page } from "@playwright/test";

export const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

export const png = (name = "pixel.png") => ({ name, mimeType: "image/png", buffer: Buffer.from(PNG_BASE64, "base64") });
export const mp4 = (name = "clip.mp4") => ({ name, mimeType: "video/mp4", buffer: Buffer.from("not really a video") });
export const pdf = (name = "report.pdf") => ({ name, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 fake") });

export const editorBox = (page: Page) => page.locator(".ContentEditable__root");

export async function open(page: Page, query = "") {
  await page.goto(`/${query}`);
  await expect(editorBox(page)).toBeVisible();
  await page.waitForFunction(() => window.__editor !== null);
}

export async function type(page: Page, text: string) {
  await editorBox(page).click();
  await page.keyboard.type(text);
}

export const savedState = (page: Page) => page.evaluate(() => window.__state);
export const events = (page: Page) =>
  page.evaluate(() => window.__events.map((e) => `${e.type}:${e.kind}`));

/** Insert > <item> from the toolbar dropdown. */
export async function insertFromToolbar(page: Page, item: string) {
  await page.locator('button[aria-label="Insert specialized editor node"]').click();
  await page.locator(".dropdown .item", { hasText: new RegExp(`^\\s*${item}\\s*$`) }).click();
}

/** Paste a file into the editor the way a browser does. */
export async function pasteFile(page: Page, file: { name: string; mimeType: string; base64: string }) {
  await editorBox(page).click();
  await page.evaluate(({ name, mimeType, base64 }) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], name, { type: mimeType }));
    const target = document.querySelector(".ContentEditable__root")!;
    target.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, file);
}

export const toBase64 = (f: { buffer: Buffer }) => f.buffer.toString("base64");
