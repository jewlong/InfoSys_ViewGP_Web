import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import { createStore } from "./store.mjs";
import { validateProject } from "../src/model.ts";
const root = resolve(import.meta.dirname, "..");
const store = createStore(
  process.env.VIEWX_DB_PATH || resolve(root, ".data/viewx.db"),
);
const production = process.env.NODE_ENV === "production";
const vite = production
  ? null
  : await (
      await import("vite")
    ).createServer({ root, server: { middlewareMode: true }, appType: "spa" });
const send = (res, status, value) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      if (req.method === "GET" && url.pathname === "/api/health")
        return send(res, 200, { status: "ok", storage: "sqlite" });
      if (req.method === "GET" && url.pathname === "/api/projects")
        return send(res, 200, store.list());
      const match = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
      if (match && req.method === "GET") {
        const p = store.get(decodeURIComponent(match[1]));
        return send(res, p ? 200 : 404, p ?? { error: "找不到專案" });
      }
      if (match && req.method === "PUT") {
        const origin = req.headers.origin;
        if (
          origin &&
          origin !== `http://${req.headers.host}` &&
          origin !== `https://${req.headers.host}`
        )
          return send(res, 403, { error: "不允許跨來源寫入" });
        if (!req.headers["content-type"]?.startsWith("application/json"))
          return send(res, 415, { error: "請使用 JSON 格式" });
        let size = 0;
        const chunks = [];
        for await (const c of req) {
          size += c.length;
          if (size > 20 * 1024 * 1024)
            return send(res, 413, { error: "專案超過 20 MB" });
          chunks.push(c);
        }
        let body;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString());
        } catch {
          return send(res, 400, { error: "JSON 格式錯誤" });
        }
        const p = body.project;
        if (
          !validateProject(p) ||
          p.id !== decodeURIComponent(match[1]) ||
          !Number.isInteger(body.revision) ||
          body.revision < 0
        )
          return send(res, 400, { error: "專案資料格式錯誤" });
        return send(res, 200, store.save(p, body.revision));
      }
      return send(res, 404, { error: "API 不存在" });
    }
    if (vite) return vite.middlewares(req, res);
    const pathname = decodeURIComponent(url.pathname);
    let file = resolve(root, "dist", `.${pathname}`);
    const dist = resolve(root, "dist");
    if (file !== dist && !file.startsWith(dist + "/"))
      return send(res, 403, { error: "路徑無效" });
    if (!existsSync(file) || !extname(file)) file = resolve(dist, "index.html");
    const mime = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".ico": "image/x-icon",
    };
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
    });
    res.end(readFileSync(file));
  } catch (e) {
    console.error(e.message);
    send(res, e.status || 500, { error: e.status ? e.message : "伺服器錯誤" });
  }
});
server.listen(
  Number(process.env.PORT) || 3000,
  process.env.HOST || "127.0.0.1",
  () =>
    console.log("ViewX Studio running on port " + (process.env.PORT || 3000)),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close();
    vite?.close();
    store.close();
    process.exit(0);
  });
