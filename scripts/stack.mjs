/**
 * Поднимает API, ждёт порт TCP, затем Vite (`npm run dev`).
 * Так не будет proxy ETIMEDOUT из‑за незапущенного бэкенда.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import waitOn from "wait-on";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

const PORT = String(process.env.MESSENGER_API_PORT || process.env.PORT || "8001");

const api = spawn(process.execPath, [join(__dirname, "run-api.mjs")], {
  cwd: repoRoot,
  stdio: "inherit",
  env: process.env,
});

function shutdown(code = 0) {
  try {
    api.kill("SIGKILL");
  } catch {
    /* ignore */
  }
  process.exit(code);
}

process.once("SIGINT", () => {
  try {
    api.kill("SIGINT");
  } catch {
    shutdown(130);
  }
});
process.once("SIGTERM", () => shutdown(143));

api.once("exit", (code, signal) => {
  if (signal) process.exit(signal === "SIGINT" ? 130 : 1);
  if (code && code !== 0) process.exit(code);
});

try {
  await waitOn({
    resources: [`tcp:127.0.0.1:${PORT}`],
    timeout: 120_000,
    interval: 250,
    window: 1000,
  });
} catch {
  console.error(
    `\n[stack] За 2 минуты не открылись ${PORT}: проверьте ошибки uvicorn/Python выше или порт занят.\n`,
  );
  shutdown(1);
}

const web = spawn("npm", ["run", "dev", "--silent"], {
  cwd: repoRoot,
  stdio: "inherit",
  shell: true,
  env: process.env,
});

web.on("error", (err) => {
  console.error(err);
  shutdown(1);
});

web.on("exit", (code, signal) => {
  if (signal) {
    shutdown(signal === "SIGINT" ? 130 : 1);
    return;
  }
  shutdown(code ?? 0);
});
