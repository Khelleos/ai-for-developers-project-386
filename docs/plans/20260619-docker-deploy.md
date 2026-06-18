# Docker и деплой: единый образ (backend обслуживает собранный frontend)

## Overview

Упаковываем приложение в один Docker-образ: multi-stage сборка собирает статику
frontend (Vite), затем FastAPI-backend раздаёт эту статику и обслуживает API из
того же процесса. Контейнер автоматически стартует uvicorn по порту из переменной
окружения PORT. Затем образ деплоится (Render, при проблемах — Railway), и в
репозиторий добавляется публичная ссылка.

Архитектура запросов: статика и API живут на одном origin, поэтому frontend
собирается с пустым `VITE_API_BASE_URL` и обращается к API относительными путями
(`/event-types`, `/bookings`) — CORS в проде не требуется.

## Context

- Files involved:
  - Create: `Dockerfile` (корень репо, multi-stage)
  - Create: `.dockerignore`
  - Modify: `backend/app/main.py` — монтирование статики frontend
  - Modify: `backend/app/config.py` — путь к каталогу собранной статики (`FRONTEND_DIST`)
  - Create: `backend/tests/test_static.py` — тест раздачи статики
  - Modify: `README.md` (корень) и/или `backend/README.md`, `CLAUDE.md` — документация и публичная ссылка
- Related patterns:
  - `backend/app/config.py` уже читает `PORT` из окружения (default 8000) и `CORS_ORIGINS`.
  - Роутеры монтируются в `main.py` через `include_router` без префикса (`/event-types`, `/bookings`); статика монтируется ПОСЛЕ них, поэтому API-маршруты имеют приоритет.
  - `frontend/src/config.ts`: `API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4010"` — пустая строка не nullish, поэтому `VITE_API_BASE_URL=""` даёт относительный baseUrl.
  - `frontend` собирается командой `npm run build` (`tsc -b && vite build`) в `dist/`; `src/api/schema.ts` уже закоммичен, регенерация при сборке образа не нужна.
- Dependencies: Docker; для деплоя — Render MCP (запасной — Railway MCP). Базовые образы: `node:22-alpine` (сборка frontend), `python:3.11-slim` (runtime backend).

## Development Approach

- **Testing approach**: Regular (сначала код, затем тесты).
- Бизнес-логика не меняется; добавляется только раздача статики и инфраструктура контейнера.
- Условное монтирование статики (только если каталог dist существует), чтобы существующие backend-тесты и локальный запуск без сборки frontend продолжали работать.
- Завершать каждую задачу полностью перед переходом к следующей.
- **CRITICAL: каждая задача с изменением кода включает новые/обновлённые тесты.**
- **CRITICAL: все тесты проходят перед началом следующей задачи.**

## Implementation Steps

### Task 1: Backend раздаёт собранный frontend

**Files:**
- Modify: `backend/app/config.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_static.py`

- [ ] В `config.py` добавить `FRONTEND_DIST` — путь к каталогу собранной статики, читаемый из окружения (`os.environ.get("FRONTEND_DIST", ...)`) с разумным значением по умолчанию.
- [ ] В `main.py` добавить функцию `mount_frontend(target: FastAPI, dist_path: str) -> None`, которая монтирует `StaticFiles(directory=dist_path, html=True)` в `/` только если каталог существует (с `index.html`); регистрируется ПОСЛЕ `include_router`, чтобы не перехватывать `/event-types`, `/bookings`, `/docs`, `/openapi.json`.
- [ ] Вызвать `mount_frontend(app, config.FRONTEND_DIST)` в `main.py`.
- [ ] Написать `tests/test_static.py`: на временном каталоге с `index.html` проверить, что `mount_frontend` отдаёт `index.html` на `GET /`; и что без каталога приложение поднимается без статики (API по-прежнему работает).
- [ ] Запустить backend-тесты (`pytest`) — должны пройти перед Task 2.

### Task 2: Dockerfile и .dockerignore

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] Multi-stage `Dockerfile`:
  - Stage build (`node:22-alpine`): `WORKDIR /frontend`, копировать `frontend/package*.json`, `npm ci`, копировать остальной `frontend/`, собрать с `ENV VITE_API_BASE_URL=""` → артефакт `dist/`.
  - Stage runtime (`python:3.11-slim`): `WORKDIR /app`, копировать `backend/requirements.txt`, `pip install --no-cache-dir -r requirements.txt`, копировать `backend/`, копировать `dist/` из build-стадии в каталог статики, задать `ENV FRONTEND_DIST=<путь к статике>` и `ENV PORT=8000`.
  - `EXPOSE 8000`; `CMD` в shell-форме запускает `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}` — старт автоматический, порт из PORT.
- [ ] Создать `.dockerignore`: исключить `**/.venv`, `**/node_modules`, `**/dist`, `tsp-output`, `**/__pycache__`, `**/.pytest_cache`, `**/.ruff_cache`, `.git`, `.ralphex`.
- [ ] Регрессионная проверка: запустить backend-тесты (`pytest`) — должны пройти (код раздачи статики не сломан).

### Task 3: Verify acceptance criteria

- [ ] Запустить полный backend-тест-сьют (`cd backend; pytest`) — все проходят.
- [ ] Запустить линтер backend (`ruff check`), если настроен.
- [ ] Проверить покрытие backend (`pytest --cov`) — 80%+.

### Task 4: Update documentation

- [ ] Обновить `CLAUDE.md` (раздел Backend / новый раздел Docker): описать единый образ, сборку, переменные `PORT` и `FRONTEND_DIST`, запуск контейнера.
- [ ] Обновить `README.md` (корень) или `backend/README.md`: инструкции `docker build` / `docker run -e PORT=...`, и плейсхолдер для публичной ссылки после деплоя.

## Post-Completion (manual / external — выполняется агентом/пользователем вне автоматических чек-боксов)

- [ ] Собрать образ локально: `docker build -t call-booking .`
- [ ] Проверить локальный запуск по PORT: `docker run -e PORT=8000 -p 8000:8000 call-booking`, открыть `http://localhost:8000/` (frontend) и `http://localhost:8000/docs` (API).
- [ ] Задеплоить на Render через Render MCP (тот же Dockerfile, запуск по PORT). При проблемах (оплата/недоступность) — задеплоить на Railway через Railway MCP.
- [ ] Получить публичную ссылку, проверить работу приложения по ней.
- [ ] Добавить публичную ссылку в репозиторий (README.md).
