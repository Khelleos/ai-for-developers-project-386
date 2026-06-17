# Реализация бэкенда (Python + FastAPI, in-memory)

## Overview

Реализуем серверную часть call-booking сервиса строго по зафиксированному
контракту (TypeSpec → OpenAPI). Стек: Python + FastAPI + Pydantic, хранилище —
в памяти (после перезапуска данные сбрасываются). Бэкенд предоставляет ровно те
операции и коды ответов, что описаны в контракте, и enforces бизнес-правила
бронирования на сервере. Клиент — существующий React-фронтенд, который указывает
`VITE_API_BASE_URL` на этот бэкенд вместо Prism-мока.

## Context

- Контракт (источник истины): `models.tsp`, `errors.tsp`,
  `routes/event-types.tsp`, `routes/bookings.tsp`, эмитится в
  `tsp-output/schema/openapi.yaml`.
- Операции контракта:
  - `POST /event-types` → 201 EventType | 400
  - `GET /event-types` → 200 EventType[]
  - `GET /event-types/{eventTypeId}/slots?date=` → 200 Slot[] | 404
  - `POST /bookings` → 201 Booking | 400 | 404 | 409
  - `GET /bookings?from=` → 200 Booking[]
- Ошибки (дискриминирующий `code`): `validation_error` (400), `not_found` (404),
  `slot_conflict` (409).
- Доменные константы: бизнес-часы 09:00–17:00 (owner-local), сетка слотов 30 мин,
  окно 14 дней, глобальное правило «один звонок одновременно» (overlap проверяется
  по всем event types).
- Фронтенд: `frontend/src/config.ts` берёт base URL из `VITE_API_BASE_URL`
  (по умолчанию `http://localhost:4010`) — бэкенд должен быть доступен по HTTP
  с CORS для фронтенда.
- Новый код: каталог `backend/` со своим окружением (полностью отделён от
  TypeSpec-проекта, как и `frontend/`).

## Development Approach

- **Testing approach**: Regular (сначала код, затем тесты) — pytest + FastAPI
  TestClient.
- Реализация идёт от контракта: формы запросов/ответов и коды статусов
  соответствуют OpenAPI, а не удобству фреймворка.
- owner-local время трактуем как UTC в этой in-memory реализации
  (детерминированные тесты), что документируется.
- Каждая задача включает тесты; все тесты должны проходить перед следующей
  задачей.
- Цель покрытия — 80%+.

## Implementation Steps

### Task 1: Каркас backend-проекта

**Files:**
- Create: `backend/requirements.txt` (fastapi, uvicorn[standard], pydantic[email], pytest, httpx, pytest-cov)
- Create: `backend/app/__init__.py`, `backend/app/main.py`, `backend/app/config.py`
- Create: `backend/pyproject.toml` (или `pytest.ini`), `backend/.gitignore`
- Create: `backend/tests/__init__.py`, `backend/tests/conftest.py`

- [x] Создать структуру каталога `backend/` и `requirements.txt`
- [x] `config.py`: константы BUSINESS_HOURS_START=9, BUSINESS_HOURS_END=17, SLOT_STEP_MINUTES=30, BOOKING_WINDOW_DAYS=14, настраиваемый порт и CORS-origin
- [x] `main.py`: создать FastAPI-приложение, подключить CORS (allow фронтенд-origin), заглушки роутеров
- [x] `conftest.py`: фикстура TestClient со сбросом in-memory хранилища между тестами
- [x] Написать smoke-тест (приложение поднимается, `/openapi.json` доступен)
- [x] Прогнать pytest — должен пройти перед Task 2

### Task 2: Доменные модели, хранилище и обработка ошибок

**Files:**
- Create: `backend/app/models.py`, `backend/app/storage.py`, `backend/app/errors.py`
- Modify: `backend/app/main.py`

- [x] `models.py`: Pydantic-модели EventType, EventTypeCreate, Slot, Guest, Booking, BookingCreate — поля/валидаторы по контракту (minLength≥1, durationMinutes≥1, email-формат)
- [x] `storage.py`: in-memory репозиторий (dict) для event types и bookings + генерация id и createdAt
- [x] `errors.py`: доменные исключения и Pydantic-модели ответов ValidationError/NotFoundError/SlotConflictError с полем `code`; зарегистрировать exception handlers в `main.py`, чтобы тела ошибок совпадали с контрактом
- [x] Тесты: сериализация моделей, отклонение невалидных данных, формат тел ошибок
- [x] Прогнать pytest — должен пройти перед Task 3

### Task 3: Endpoints event types (create + list)

**Files:**
- Create: `backend/app/routers/event_types.py`, `backend/app/routers/__init__.py`
- Modify: `backend/app/main.py`

- [x] `POST /event-types` → 201 с созданным EventType; 400 при невалидном payload
- [x] `GET /event-types` → 200 со списком всех event types
- [x] Подключить роутер в `main.py`
- [x] Тесты: создание (happy path), 400 на пустой title / неположительную длительность, list возвращает созданные
- [x] Прогнать pytest — должен пройти перед Task 4

### Task 4: Генерация слотов + endpoint listSlots

**Files:**
- Create: `backend/app/booking_rules.py`
- Modify: `backend/app/routers/event_types.py`

- [x] `booking_rules.py`: генерация слотов по сетке 30 мин в пределах 09:00–17:00 так, что `start + durationMinutes <= 17:00`, в окне 14 дней, исключая прошлое и слоты, пересекающиеся с существующими бронированиями (глобально)
- [x] `GET /event-types/{eventTypeId}/slots?date=` → 200 Slot[]; 404 при неизвестном eventTypeId; фильтр по одному дню через `date`
- [x] Тесты: корректная сетка/границы часов, исключение прошлого и слотов вне окна, исключение занятых слотов, фильтр по `date`, 404 на несуществующий event type
- [x] Прогнать pytest — должен пройти перед Task 5

### Task 5: Endpoints bookings (create с проверкой занятости + list)

**Files:**
- Create: `backend/app/routers/bookings.py`
- Modify: `backend/app/main.py`, `backend/app/booking_rules.py`

- [x] `POST /bookings`: вывести `end` из длительности event type, ре-валидировать; 400 (off-grid/в прошлом/вне окна/невалидный payload), 404 (неизвестный eventTypeId), **409 при пересечении с существующим бронированием** (глобальное правило «один звонок одновременно»); 201 с созданным Booking
- [x] `GET /bookings?from=` → 200, отсортировано по start, фильтр по `from` (по умолчанию «сейчас»)
- [x] Подключить роутер в `main.py`
- [x] Тесты: happy-path создание, **409 при занятом слоте** (точное и частичное пересечение), 400 для off-grid/past/out-of-window, 404 неизвестный event type, list с сортировкой и фильтром `from`
- [x] Прогнать pytest — должен пройти перед Task 6

### Task 6: Verify acceptance criteria

- [x] Прогнать полный тест-набор (`pytest` из `backend/`) — 51 passed
- [x] Прогнать линтер, если настроен (ruff); иначе пропустить с пометкой — ruff не установлен в окружении, пропущено
- [x] Проверить покрытие ≥80% (`pytest --cov`) — 99% (TOTAL 207 stmts, 3 miss)
- [x] Убедиться, что сервер запускается (`uvicorn app.main:app`) и эндпоинты отвечают согласно контракту — uvicorn поднят, `/openapi.json` 200, `GET /event-types` 200 []

### Task 7: Update documentation

- [ ] Создать `backend/README.md`: стек, запуск (`uvicorn`), порт/CORS, как направить фронтенд (`VITE_API_BASE_URL`) на бэкенд, запуск тестов
- [ ] Обновить `CLAUDE.md`: добавить раздел про `backend/` (Python + FastAPI, in-memory, реализация по контракту, рабочий процесс с фронтендом)
