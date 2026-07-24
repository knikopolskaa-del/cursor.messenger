# Карта проекта cursor.messenger

Сводка: что где лежит и за что отвечает.  
Стек: **React (Vite)** + **FastAPI** + **SQLite** + **Yandex Object Storage**.

---

## Корень репозитория

| Файл / каталог | Категория | Назначение |
|----------------|-----------|------------|
| `index.html` | Frontend | Точка входа SPA, Tailwind CDN, темы light/dark |
| `vite.config.js` | Frontend / Dev | Сборка, dev-прокси API-префиксов на localhost:8001 |
| `package.json`, `package-lock.json` | Frontend / Dev | npm-скрипты, зависимости React |
| `playwright.config.ts` | E2E | Конфиг Playwright |
| `.env.example` | Config | Шаблон переменных (prod/dev, YOS, БД) — **без секретов** |
| `.gitignore` | System | Игнор `.env`, `node_modules`, `dist`, БД, uploads |
| `public/` | Frontend | Статика Vite (сейчас `.gitkeep`) |

---

## Frontend (`src/`)

| Путь | Подкатегория | Назначение |
|------|--------------|------------|
| `src/main.jsx` | Frontend | Mount React |
| `src/App.jsx` | Frontend | Роутинг (react-router) |
| `src/ErrorBoundary.jsx` | Frontend | Ошибки UI |
| **Страницы** `src/pages/` | Frontend / UI | |
| `LoginPage.jsx`, `RegisterPage.jsx` | Frontend | Auth UI |
| `ChatPage.jsx` | Frontend | Основной чат |
| `MePage.jsx`, `SettingsPage.jsx` | Frontend | Профиль, настройки |
| `AggregatorPages.jsx` | Frontend | Сводные экраны |
| `NotFound.jsx` | Frontend | 404 |
| **Layout** `src/layout/AppShell.jsx` | Frontend / Design | Оболочка приложения |
| **Компоненты** `src/components/` | Frontend / Design | |
| `ChatComponents.jsx` | Frontend | Чат, сообщения, UI чата |
| `ui.jsx` | Frontend / Design | Общие UI-примитивы |
| `ThemeToggle.jsx` | Frontend / Design | Переключатель темы |
| `SearchDropdown.jsx` | Frontend | Поиск |
| `src/modals/CreateModals.jsx` | Frontend | Модалки создания каналов/групп |
| **Состояние** `src/context/MessengerContext.jsx` | Frontend | Глобальный state мессенджера |
| **API-клиент** `src/lib/` | Frontend | |
| `api.js` | Frontend | HTTP, `API_BASE`, `VITE_API_URL`, токен |
| `chatApi.js` | Frontend | Вызовы API чата |
| `validation.js` | Frontend | Валидация форм |
| `utils.js` | Frontend | Утилиты |
| `theme.js` | Frontend / Design | Тема (localStorage) |

**Дизайн:** Tailwind через CDN в `index.html`, CSS-переменные тем, шрифты Caveat/Nunito.

---

## Backend (`backend/`)

| Путь | Категория | Назначение |
|------|-----------|------------|
| `backend/requirements.txt` | Backend | Python-зависимости (FastAPI, SQLAlchemy, bcrypt, boto3) |
| `backend/app/main.py` | Backend | FastAPI app, CORS, lifespan, роутеры, prod docs off |
| `backend/app/database.py` | **БД** | SQLite URL, engine, session, лёгкие миграции колонок |
| `backend/app/models.py` | **БД** | SQLAlchemy-модели |
| `backend/app/schemas.py` | Backend | Pydantic-схемы API |
| `backend/app/store.py` | Backend | Доменная логика / доступ к данным |
| `backend/app/serialize.py` | Backend | Сериализация в ответы API |
| `backend/app/seed.py` | **БД** | Seed пустой БД (dev) |
| `backend/app/deps.py` | Backend / Security | `current_user`, проверка сессии |
| `backend/app/access.py` | Security | Права, guest, участники |
| `backend/scripts/ensure_e2e_user.py` | E2E | Пользователь для тестов |

### Security (`backend/app/`)

| Файл | Назначение |
|------|------------|
| `security.py` | bcrypt, pepper, prod-проверки, TTL сессий, регистрация |
| `rate_limit.py` | Лимит auth по IP (in-memory) |
| `http_errors.py` | Безопасные ошибки клиенту, без stack trace в prod |
| `upload_policy.py` | MIME allowlist, inline preview |
| `bootstrap_admin.py` | Первый admin в БД (скрипт) |

### Object Storage

| Файл | Назначение |
|------|------------|
| `yos.py` | Yandex Object Storage, presigned URL, upload |
| `file_uploads.py` | Логика загрузок |
| `routers/files.py` | `POST /uploads`, до 100 MB → YOS |

### API-роутеры (`backend/app/routers/`)

| Файл | Префикс / область |
|------|-------------------|
| `auth.py` | `/auth` — login, register, invite, сессии |
| `users.py` | `/me`, пользователи |
| `admin.py` | `/admin` |
| `workspace.py` | workspace |
| `channels.py` | `/channels` |
| `groups.py` | `/groups` |
| `directs.py` | `/directs` |
| `conversations.py` | `/conversations`, сообщения |
| `messages.py` | patch/delete сообщений |
| `attachments.py` | вложения |
| `reactions.py` | реакции |
| `saved.py` | `/saved` |
| `activities.py` | `/activities` |
| `search.py` | `/search` |
| `files.py` | `/uploads`, `/files` |

Контракт для тестов: `api_contract.py`.

---

## База данных

| Что | Где |
|-----|-----|
| Файл SQLite (dev) | `backend/messenger.db` (в git есть файл — для dev; prod: `/var/lib/messenger/`) |
| URL | env `MESSENGER_DATABASE_URL` |
| Инициализация | `init_db()` из `database.py`, lifespan в `main.py` |
| Миграции | Минимальные `PRAGMA`/ensure columns в `database.py`; при смене схемы в dev иногда проще пересоздать БД |

---

## E2E и тесты (`e2e/`, скрипты)

| Файл | Назначение |
|------|------------|
| `docs/TEST_CASES.md` | **Реестр тест-кейсов** (ручные + связь с E2E). Обновлять при каждой новой фиче |
| `e2e/messenger.spec.ts` | UI: login, chat, logout, routes |
| `e2e/z-api-security.spec.ts` | API: 401/403/429, validation |
| `e2e/helpers/api.ts` | Хелперы HTTP для API-тестов |
| `scripts/ensure-e2e-user.mjs` | Подготовка user перед Playwright |
| `scripts/pw_check.mjs` | Вспомогательный check Playwright |

Запуск: `npm run stack` → `npm run e2e:ensure-user` → `npm run test:e2e`.

---

## Dev и локальный запуск (`scripts/`, `dev/`)

| Файл | Назначение |
|------|------------|
| `scripts/run-api.mjs` | uvicorn из `backend/`, порт 8001 |
| `scripts/stack.mjs` | API + Vite одной командой |
| `dev/api-tester.html` | Ручной API-тester (только dev, не в prod build) |

---

## Безопасность и CI (корень, `technium-security/`)

| Файл | Назначение |
|------|------------|
| `.github/workflows/security.yml` | CI: gitleaks и связанные проверки |
| `.gitleaks.toml` | Правила поиска секретов |
| `technium-security/SKILL.md` | Чеклист/скилл security-аудита |

---

## Config / окружение

| Файл | Назначение |
|------|------------|
| `.env.example` | Документация env: APP_ENV, CORS, YOS, SQLite, bootstrap admin |
| `.env` | **Локально, не в git** — реальные ключи |
| На сервере prod | `/etc/messenger/.env` → симлинк в `/opt/messenger/app/.env` |

---

## System / сборка (не исходники)

| Путь | Назначение |
|------|------------|
| `node_modules/` | npm (gitignore) |
| `dist/` | Production-сборка фронта (gitignore) |
| `backend/.venv/` | Python venv (gitignore) |
| `backend/uploads/` | Legacy/local uploads (gitignore) |
| `test-results/`, `playwright-report/` | Отчёты E2E (gitignore) |

---

## Дерево по смыслу (кратко)

```
cursor.messenger/
├── Frontend + Design
│   index.html, vite.config.js, src/
├── Backend API
│   backend/app/main.py, routers/, store, schemas
├── БД
│   database.py, models.py, seed.py, messenger.db (dev)
├── Security
│   security.py, rate_limit.py, access.py, deps.py,
│   upload_policy.py, http_errors.py, bootstrap_admin.py
├── Storage (YOS)
│   yos.py, routers/files.py, file_uploads.py
├── E2E
│   e2e/, playwright.config.ts, ensure-e2e-user*
├── Dev tooling
│   scripts/, dev/api-tester.html
├── CI / secrets scan
│   .github/workflows/security.yml, .gitleaks.toml
├── Docs / skills
│   technium-security/SKILL.md, .env.example
└── Личные заметки (вне репо)
    ~/.cursor/messenger-deploy-update.md
    ~/.cursor/messenger-project-map.md  ← копия этой карты (опционально)
```

---

## npm-скрипты (смысл)

| Скрипт | Категория |
|--------|-----------|
| `npm run dev` | Frontend dev |
| `npm run api` | Backend dev |
| `npm run stack` | Frontend + Backend |
| `npm run build` | Frontend prod → `dist/` |
| `npm run test:e2e` | E2E |
| `npm run e2e:ensure-user` | E2E подготовка |

---

*Обновляйте карту при добавлении каталогов или крупных модулей.*
