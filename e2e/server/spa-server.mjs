// Serves the built SPA plus a tiny in-memory upload API for the e2e tests.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const root = join(process.cwd(), "e2e/apps/vite-spa/dist");
const uploads = new Map();
let n = 0;

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "POST" && url.pathname === "/api/upload") {
    if (url.searchParams.get("fail") === "1") {
      res.writeHead(500).end("boom");
      return;
    }
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    // Pull the first file part out of the multipart body (enough for tests).
    const text = body.toString("latin1");
    const headerEnd = text.indexOf("\r\n\r\n");
    const header = text.slice(0, headerEnd);
    const type = /Content-Type: ([^\r\n]+)/i.exec(header)?.[1] ?? "application/octet-stream";
    const name = /filename="([^"]*)"/.exec(header)?.[1] ?? "file";
    const boundary = text.slice(0, text.indexOf("\r\n"));
    const end = text.lastIndexOf("\r\n" + boundary);
    const data = body.subarray(headerEnd + 4, end);
    const id = `${++n}-${name}`;
    uploads.set(id, { type, data });
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ url: `/uploads/${encodeURIComponent(id)}` }));
    return;
  }
  if (url.pathname.startsWith("/uploads/")) {
    const item = uploads.get(decodeURIComponent(url.pathname.slice(9)));
    if (!item) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": item.type }).end(item.data);
    return;
  }
  let file = join(root, url.pathname);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, "index.html");
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
}).listen(4173, () => console.log("spa server on 4173"));
