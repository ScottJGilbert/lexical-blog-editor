import { describe, expect, it, vi } from "vitest";
import {
  UploadManager,
  classifyFile,
  matchesMime,
  type MediaUploadOptions,
  type UploadEvent,
} from "@blog/editor-upload";

const file = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });
const manager = (options: MediaUploadOptions = {}) => {
  const ref = { options };
  const m = new UploadManager(() => ref.options);
  const events: UploadEvent[] = [];
  m.subscribe((e) => events.push(e));
  return { m, events, ref };
};
const types = (events: UploadEvent[]) => events.map((e) => e.type);

describe("classification and MIME matching", () => {
  it.each([
    ["a.png", "image/png", "image"],
    ["a.svg", "image/svg+xml", "image"],
    ["a.mp4", "video/mp4", "video"],
    ["a.mp3", "audio/mpeg", "audio"],
    ["a.pdf", "application/pdf", "file"],
    ["a", "", "file"],
  ])("%s (%s) -> %s", (name, type, kind) => {
    expect(classifyFile({ name, type })).toBe(kind);
  });
  it("matches wildcards and exact types case-insensitively", () => {
    expect(matchesMime("image/PNG", ["image/*"])).toBe(true);
    expect(matchesMime("application/pdf", ["application/pdf"])).toBe(true);
    expect(matchesMime("application/zip", ["application/pdf"])).toBe(false);
    expect(matchesMime("anything/x", ["*/*"])).toBe(true);
    expect(matchesMime("video/mp4", ["image/*"])).toBe(false);
  });
});

describe("lifecycle events", () => {
  it("emits start -> progress -> success with the handler's URL", async () => {
    const { m, events } = manager({
      onUpload: async (_f, ctx) => {
        ctx.onProgress(0.25);
        ctx.onProgress(1);
        return "https://cdn.test/a.png";
      },
    });
    const hooks = { onStart: vi.fn(), onProgress: vi.fn(), onSuccess: vi.fn() };
    await m.start(file("a.png", "image/png"), hooks);
    expect(types(events)).toEqual(["start", "progress", "progress", "success"]);
    expect(hooks.onStart).toHaveBeenCalledOnce();
    expect(hooks.onSuccess).toHaveBeenCalledWith(expect.objectContaining({ kind: "image" }), { src: "https://cdn.test/a.png" });
    expect(events.every((e) => e.id === events[0].id)).toBe(true);
    expect(m.pending.size).toBe(0);
  });
  it("accepts result objects and keeps their metadata", async () => {
    const { m, events } = manager({ onUpload: async () => ({ src: "https://cdn.test/v.mp4", width: 640, poster: "https://cdn.test/p.jpg" }) });
    await m.start(file("v.mp4", "video/mp4"));
    expect(events.at(-1)).toMatchObject({ type: "success", result: { width: 640, poster: "https://cdn.test/p.jpg" } });
  });
  it("tracks pending uploads and reports the count", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const { m, events } = manager({ onUpload: async () => (await gate, "https://cdn.test/x") });
    const first = m.start(file("a.png", "image/png"));
    const second = m.start(file("b.png", "image/png"));
    expect(m.pending.size).toBe(2);
    expect(events.filter((e) => e.type === "start").map((e) => e.pending)).toEqual([1, 2]);
    release();
    await Promise.all([first, second]);
    expect(m.pending.size).toBe(0);
    expect(events.at(-1)?.pending).toBe(0);
  });
  it("clamps and sanitizes progress values", async () => {
    const { m, events } = manager({
      onUpload: async (_f, ctx) => {
        ctx.onProgress(5);
        ctx.onProgress(-1);
        ctx.onProgress(Number.NaN);
        return "u";
      },
    });
    await m.start(file("a.png", "image/png"));
    const progress = events.filter((e) => e.type === "progress").map((e: any) => e.progress);
    expect(progress).toEqual([1, 0, 0]);
  });
  it("reports handler failures as error events and onError", async () => {
    const { m, events } = manager({ onUpload: async () => { throw new Error("S3 exploded"); } });
    const onError = vi.fn();
    await m.start(file("a.png", "image/png"), { onError });
    expect(events.at(-1)).toMatchObject({ type: "error", reason: "handler-error" });
    expect((events.at(-1) as any).error.message).toBe("S3 exploded");
    expect(onError).toHaveBeenCalledOnce();
    expect(m.pending.size).toBe(0);
  });
  it("rejects handlers that resolve without a URL", async () => {
    const { m, events } = manager({ onUpload: (async () => ({})) as any });
    await m.start(file("a.png", "image/png"));
    expect(events.at(-1)).toMatchObject({ type: "error", reason: "handler-error" });
  });
  it("a throwing event listener cannot break the upload", async () => {
    const { m, events } = manager({ onUpload: async () => "u" });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    m.subscribe(() => { throw new Error("listener bug"); });
    await m.start(file("a.png", "image/png"));
    expect(events.at(-1)?.type).toBe("success");
    spy.mockRestore();
  });
  it("unsubscribe stops delivery", async () => {
    const { m } = manager({ onUpload: async () => "u" });
    const listener = vi.fn();
    const off = m.subscribe(listener);
    off();
    await m.start(file("a.png", "image/png"));
    expect(listener).not.toHaveBeenCalled();
  });
  it("notifies change listeners (UI progress)", async () => {
    const { m } = manager({ onUpload: async (_f, c) => (c.onProgress(0.5), "u") });
    const onChange = vi.fn();
    m.onChange(onChange);
    await m.start(file("a.png", "image/png"));
    expect(onChange).toHaveBeenCalledTimes(3); // start, progress, success
  });
});

describe("cancellation", () => {
  it("cancel() aborts the signal, emits abort and skips success", async () => {
    let seen: AbortSignal | undefined;
    const { m, events } = manager({
      onUpload: (_f, ctx) => new Promise((resolve) => { seen = ctx.signal; setTimeout(() => resolve("late"), 50); }),
    });
    const hooks = { onSuccess: vi.fn(), onAbort: vi.fn() };
    const done = m.start(file("a.png", "image/png"), hooks);
    const id = [...m.pending.keys()][0];
    m.cancel(id);
    await done;
    expect(seen?.aborted).toBe(true);
    expect(types(events)).toEqual(["start", "abort"]);
    expect(hooks.onSuccess).not.toHaveBeenCalled();
    expect(hooks.onAbort).toHaveBeenCalledOnce();
    expect(m.pending.size).toBe(0);
  });
  it("a handler that ignores the signal still ends up aborted", async () => {
    const { m, events } = manager({ onUpload: () => new Promise(() => {}) });
    const done = m.start(file("a.png", "image/png"));
    m.cancelAll();
    await done;
    expect(events.at(-1)?.type).toBe("abort");
  });
  it("cancelling an unknown or finished id is a no-op", async () => {
    const { m } = manager({ onUpload: async () => "u" });
    await m.start(file("a.png", "image/png"));
    expect(() => m.cancel("nope")).not.toThrow();
  });
});

describe("validation", () => {
  it("without a handler, images are inlined as data URLs", async () => {
    const { m, events } = manager();
    await m.start(file("a.png", "image/png", 4));
    const last = events.at(-1) as any;
    expect(last.type).toBe("success");
    expect(last.result.src).toMatch(/^data:image\/png;base64,/);
  });
  it("without a handler, non-image media is refused with a clear reason", async () => {
    const { m, events } = manager();
    const onError = vi.fn();
    await m.start(file("v.mp4", "video/mp4"), { onError });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "error", reason: "no-handler" });
    expect(onError).toHaveBeenCalledWith(null, expect.objectContaining({ reason: "no-handler" }));
  });
  it("caps inlined images", async () => {
    const { m, events } = manager();
    await m.start(file("big.png", "image/png", 6 * 1024 * 1024));
    expect(events[0]).toMatchObject({ type: "error", reason: "too-large" });
  });
  it("enforces maxFileSize overall and per kind", async () => {
    const a = manager({ onUpload: async () => "u", maxFileSize: 100 });
    await a.m.start(file("a.png", "image/png", 101));
    expect(a.events[0]).toMatchObject({ reason: "too-large" });
    const b = manager({ onUpload: async () => "u", maxFileSize: { video: 5 } });
    await b.m.start(file("a.png", "image/png", 1000));
    expect(b.events.at(-1)?.type).toBe("success");
    await b.m.start(file("v.mp4", "video/mp4", 6));
    expect(b.events.at(-1)).toMatchObject({ type: "error", reason: "too-large" });
  });
  it("honors disabled kinds and custom accept lists", async () => {
    const a = manager({ onUpload: async () => "u", kinds: ["image"] });
    await a.m.start(file("v.mp4", "video/mp4"));
    expect(a.events[0]).toMatchObject({ reason: "type-not-accepted" });
    const b = manager({ onUpload: async () => "u", accept: { file: ["application/pdf"] } });
    await b.m.start(file("x.zip", "application/zip"));
    expect(b.events[0]).toMatchObject({ reason: "type-not-accepted" });
    await b.m.start(file("x.pdf", "application/pdf"));
    expect(b.events.at(-1)?.type).toBe("success");
  });
  it("builds an accept attribute for file inputs", () => {
    const { m } = manager({ accept: { file: ["application/pdf"] } });
    expect(m.acceptAttribute(["image", "file"])).toBe("image/*,application/pdf");
    expect(manager().m.acceptAttribute(["video"])).toBe("video/*");
  });
  it("reads options lazily so inline handlers never go stale", async () => {
    const { m, ref, events } = manager({ onUpload: async () => "first" });
    ref.options = { onUpload: async () => "second" };
    await m.start(file("a.png", "image/png"));
    expect((events.at(-1) as any).result.src).toBe("second");
  });
});
