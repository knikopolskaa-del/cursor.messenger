/**
 * Запуск backend/scripts/ensure_e2e_user.py с cwd = backend/ и абсолютным путём к скрипту.
 * Не зависит от текущей оболочки: npm привязан к корню репозитория.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const backendRoot = join(repoRoot, "backend");
const scriptPath = join(backendRoot, "scripts", "ensure_e2e_user.py");

if (!existsSync(scriptPath)) {
  console.error(
    "Не найден скрипт:\n  %s\nЗапускайте команду из корня репозитория (где лежит package.json):\n  npm run e2e:ensure-user",
    scriptPath,
  );
  process.exit(1);
}

const candidates = [process.env.PYTHON, process.env.PYTHON3, "python3", "python"].filter(Boolean);
const tried = new Set();

for (const cmd of candidates) {
  if (tried.has(cmd)) continue;
  tried.add(cmd);
  const r = spawnSync(cmd, [scriptPath], {
    cwd: backendRoot,
    stdio: "inherit",
    env: process.env,
  });
  if (r.error?.code === "ENOENT") continue;
  process.exit(r.status ?? (r.signal ? 1 : 0));
}

console.error(
  "Не найден интерпретатор Python (python3 / python).\n" +
    "Пример установки зависимостей бэкенда:\n  cd backend && python3 -m pip install -r requirements.txt\n" +
    "Либо: PYTHON=/путь/к/python3 npm run e2e:ensure-user",
);
process.exit(1);
