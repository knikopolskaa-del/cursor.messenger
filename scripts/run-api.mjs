/**
 * Запуск FastAPI с cwd = backend/ (чтобы импорт app.main работал).
 * Перебирает python3 → python и переменную окружения PYTHON.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, "..", "backend");
const mainPy = join(backendRoot, "app", "main.py");

if (!existsSync(mainPy)) {
  console.error(
    "Не найден backend. Ожидался файл:\n  %s\nЗапускайте npm run api из корня репозитория (рядом с package.json).",
    mainPy,
  );
  process.exit(1);
}

const args = [
  "-m",
  "uvicorn",
  "app.main:app",
  "--reload",
  "--host",
  "127.0.0.1",
  "--port",
  "8000",
];

const candidates = [
  process.env.PYTHON,
  process.env.PYTHON3,
  "python3",
  "python",
].filter(Boolean);

const tried = new Set();

function run(cmd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: backendRoot,
      stdio: "inherit",
      env: process.env,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      resolve({ code: code ?? 1, signal });
    });
  });
}

for (const cmd of candidates) {
  if (tried.has(cmd)) continue;
  tried.add(cmd);
  try {
    const { code } = await run(cmd);
    process.exit(code);
  } catch (err) {
    if (err && err.code === "ENOENT") {
      continue;
    }
    console.error(err);
    process.exit(1);
  }
}

console.error(
  "Не найден интерпретатор Python (команды python3 / python).\n" +
    "Установите Python 3 и зависимости:\n" +
    "  cd backend && python3 -m pip install -r requirements.txt\n" +
    "Либо укажите путь: PYTHON=/path/to/python3 npm run api",
);
process.exit(1);
