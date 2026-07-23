import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

/** Dev-only: /api-tester.html (not included in production build). */
function devApiTesterPlugin() {
  return {
    name: "dev-api-tester",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url !== "/api-tester.html") {
          return next();
        }
        const filePath = path.join(repoRoot, "dev", "api-tester.html");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(fs.readFileSync(filePath));
      });
    },
  };
}

/** Совпадает с портом `npm run api` (см. scripts/run-api.mjs). */
const API_DEV = process.env.VITE_PROXY_TARGET?.trim() || "http://127.0.0.1:8001";

/** Первый сегмент пути FastAPI — фронт в dev шлёт сюда на :5173, Vite проксирует на API_DEV. */
const API_ROUTE_PREFIXES = [
  "/auth",
  "/me",
  "/users",
  "/workspace",
  "/channels",
  "/groups",
  "/directs",
  "/conversations",
  "/saved",
  "/activities",
  "/search",
  "/admin",
  "/uploads",
  "/files",
  "/attachments",
  "/messages",
];

const endpoint = { target: API_DEV, changeOrigin: true };
const apiProxies = Object.fromEntries(API_ROUTE_PREFIXES.map((prefix) => [prefix, endpoint]));

export default defineConfig({
  plugins: [react(), devApiTesterPlugin()],
  publicDir: "public",
  server: {
    port: 5173,
    proxy: {
      ...apiProxies,
      "/openapi.json": endpoint,
      "/docs": endpoint,
      "/redoc": endpoint,
    },
  },
});

