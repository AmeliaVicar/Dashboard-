# Mini Orders Dashboard

Мини-продукт для тестового задания “AI Tools Specialist”: импорт mock-заказов в RetailCRM, webhook + backfill синхронизация в Supabase, Telegram-уведомления по high-value orders и server-side dashboard на Next.js.

## Что сделано

- Одноразовый импорт `mock_orders.json -> RetailCRM`
- Основной sync path: `RetailCRM webhook -> Next.js API route -> Supabase upsert -> Telegram`
- Страховочный sync path: `Vercel Cron -> backfill route -> RetailCRM REST API -> Supabase upsert -> Telegram`
- Server-side dashboard без прямого чтения Supabase из браузера
- Идемпотентный upsert и защита от дублей Telegram-уведомлений

## Архитектура

### Контуры синхронизации

1. Основной путь:
   `RetailCRM webhook -> /api/webhooks/retailcrm -> sync core -> Supabase -> Telegram`
2. Страховочный путь:
   `Vercel Cron -> /api/cron/backfill -> RetailCRM API -> sync core -> Supabase -> Telegram`

### Почему так

- Один стек `Next.js + TypeScript` для scripts, API routes и UI
- Общая sync-логика переиспользуется в webhook и backfill, поэтому поведение и идемпотентность одинаковые
- Supabase используется как read model / analytics store, а не как источник истины вместо CRM
- Dashboard читает данные только server-side через `service_role`, без публичного ключа в браузере

## Стек

- Next.js 15 + TypeScript
- Supabase Postgres
- RetailCRM REST API
- Telegram Bot API
- Recharts
- Vercel

## Структура проекта

```text
src/
  app/
    api/
      cron/backfill/route.ts
      webhooks/retailcrm/route.ts
    globals.css
    layout.tsx
    page.tsx
  components/
    orders-chart.tsx
    recent-orders-table.tsx
    summary-cards.tsx
  lib/
    dashboard/queries.ts
    retailcrm/
      client.ts
      import-mapper.ts
      order-normalizer.ts
      webhook-parser.ts
    supabase/
      admin.ts
      orders-repo.ts
    sync/
      backfill.ts
      sync-order.ts
    telegram/
      client.ts
      notify.ts
    env.ts
    format.ts
  types/
    orders.ts
    retailcrm.ts
scripts/
  import-mock-orders.ts
supabase/
  migrations/001_create_orders.sql
data/
  mock_orders.json
```

## Env-переменные

См. `.env.example`

- `APP_BASE_URL` — базовый URL приложения
- `APP_TIMEZONE` — таймзона для форматирования
- `RETAILCRM_BASE_URL` — URL RetailCRM
- `RETAILCRM_API_KEY` — API key RetailCRM
- `RETAILCRM_SITE_CODE` — код сайта в RetailCRM
- `RETAILCRM_WEBHOOK_SECRET` — секрет для webhook endpoint
- `SUPABASE_URL` — URL Supabase проекта
- `SUPABASE_SERVICE_ROLE_KEY` — service role key для server-side записи/чтения
- `TELEGRAM_BOT_TOKEN` — токен Telegram бота
- `TELEGRAM_CHAT_ID` — ID чата/канала
- `TELEGRAM_THRESHOLD_KZT` — порог уведомления
- `CRON_SECRET` — секрет для backfill endpoint
- `BACKFILL_LOOKBACK_HOURS` — окно backfill
- `MOCK_ORDERS_PATH` — путь к `mock_orders.json`

## Анализ mock_orders.json

### Фактическая структура

Файл представляет собой массив из 50 заказов такого вида:

```json
{
  "firstName": "Айгуль",
  "lastName": "Касымова",
  "phone": "+77001234501",
  "email": "aigul.kasymova@example.com",
  "orderType": "eshop-individual",
  "orderMethod": "shopping-cart",
  "status": "new",
  "items": [
    {
      "productName": "Корректирующее бельё Nova Classic",
      "quantity": 1,
      "initialPrice": 15000
    }
  ],
  "delivery": {
    "address": {
      "city": "Алматы",
      "text": "ул. Абая 150, кв 12"
    }
  },
  "customFields": {
    "utm_source": "instagram"
  }
}
```

### Mapping в RetailCRM

- `firstName -> order.firstName`
- `lastName -> order.lastName`
- `phone -> order.phone`
- `email -> order.email`
- `orderType -> order.orderType`
- `orderMethod -> order.orderMethod`
- `status -> order.status`
- `delivery.address.city -> order.delivery.address.city`
- `delivery.address.text -> order.delivery.address.text`
- `customFields -> order.customFields`
- `items[].productName -> order.items[].productName`
- `items[].quantity -> order.items[].quantity`
- `items[].initialPrice -> order.items[].initialPrice`

### Допущения по RetailCRM API

- Используется `POST /api/v5/orders/create`
- `apiKey` передаётся query-параметром
- `site` и `order` передаются form-urlencoded, где `order` — JSON string
- Для backfill используется `GET /api/v5/orders` с фильтрами `filter[updatedAtFrom]` / `filter[updatedAtTo]`
- Если в конкретном аккаунте названия фильтров отличаются, это меняется только в `src/lib/retailcrm/client.ts`

## Схема БД

Основная таблица — `orders`. Она хранит нормализованную read model, состояние уведомления и сырой payload из RetailCRM.

Ключевые решения:

- `retailcrm_id` — основной ключ идемпотентности для upsert
- `external_id` — дополнительный уникальный след из import script
- `raw_payload jsonb` — для честного дебага и повторного анализа
- `telegram_notified`, `telegram_notified_at`, `notification_error` — состояние Telegram слоя
- `claim_order_notification()` — Postgres функция для atomic claim перед отправкой уведомления

SQL лежит в `supabase/migrations/001_create_orders.sql`

## Локальный запуск

1. Создать `.env` по образцу `.env.example`
2. Установить зависимости:

```bash
npm install
```

3. Применить SQL миграцию в Supabase
4. Убедиться, что `mock_orders.json` лежит по пути из `MOCK_ORDERS_PATH`
5. Запустить dev-сервер:

```bash
npm run dev
```

## Импорт mock_orders.json в RetailCRM

Скрипт: `scripts/import-mock-orders.ts`

Что делает:

- читает `mock_orders.json`
- строит стабильный `externalId`
- проверяет уже существующие заказы в RetailCRM
- создаёт только отсутствующие
- логирует `processed / imported / skipped / failed`

Запуск:

```bash
npm run import:mock-orders
```

## Sync RetailCRM -> Supabase

### Общая логика

Слой синхронизации расположен в:

- `src/lib/sync/sync-order.ts`
- `src/lib/retailcrm/order-normalizer.ts`
- `src/lib/supabase/orders-repo.ts`

Поток:

1. Получить заказ из RetailCRM или взять его из webhook payload
2. Нормализовать в единый internal model
3. Проверить существующую запись в Supabase
4. Если данные не изменились:
   обновить только `synced_at`
5. Если изменились:
   сделать upsert по `retailcrm_id`
6. После upsert выполнить notification logic

## Webhook flow

Route: `src/app/api/webhooks/retailcrm/route.ts`

Особенности:

- принимает webhook payload
- если payload неполный, добирает полный заказ из RetailCRM
- принимает секрет через `?secret=...` или header `x-webhook-secret`
- повторные webhook вызовы не ломают данные: upsert идемпотентен
- повторные уведомления не шлются из-за notification claim + флагов в БД

## Telegram notifications

### Варианты защиты от дублей

1. Только boolean `telegram_notified`
2. Отдельная notification/event table

### Что выбрано

Для тестового задания выбран усиленный минималистичный вариант на одной таблице:

- `telegram_notified`
- `telegram_notified_at`
- `notification_error`
- SQL-функция `claim_order_notification()`

Почему:

- проще, чем отдельная event table
- лучше обычного boolean-only подхода
- достаточно надёжно для связки webhook + cron

Логика:

- уведомлять только если `total_amount > TELEGRAM_THRESHOLD_KZT`
- перед отправкой атомарно “захватывать” заказ через Postgres функцию
- при успехе выставлять `telegram_notified = true`
- при ошибке писать текст ошибки в `notification_error`

## Dashboard

Page: `src/app/page.tsx`

Состав:

- summary cards
- график заказов по дням
- таблица последних заказов

Особенности:

- данные читаются только server-side
- агрегаты считаются на сервере
- браузер не получает `service_role`
- UI намеренно компактный и без лишних страниц

## Deploy на Vercel

### Что нужно в Vercel env

- все переменные из `.env.example`

### Cron

Настроен через `vercel.json` на вызов:

- `/api/cron/backfill`

Рекомендуется хранить `CRON_SECRET` в Vercel env и принимать `Authorization: Bearer <CRON_SECRET>` на route.

### Типовые ошибки в проде

- неверный `RETAILCRM_SITE_CODE`
- webhook route недоступен из-за неверного секрета
- `service_role` не задан или используется не тот ключ
- Telegram bot не добавлен в нужный чат
- в RetailCRM фильтры list orders могут отличаться в конкретной инсталляции

## Live integration findings

- В текущем окружении не было доступа к настройке webhook в интерфейсе RetailCRM. Поэтому в финальной демонстрации основным фактически используемым контуром синхронизации стал `scheduled backfill`, а webhook route оставлен реализованным и дополнительно проверен ручным POST-запросом.
- В реальном аккаунте RetailCRM код `orderType=eshop-individual` отсутствовал. Для импорта пришлось использовать `RETAILCRM_DEFAULT_ORDER_TYPE=main`.
- Фильтры `filter[updatedAtFrom]` / `filter[updatedAtTo]` не поддерживались этим конкретным RetailCRM аккаунтом. Поэтому backfill реализован с fallback на full scan pagination.
- Для reference-only webhook payload вида `{"id": 41}` пришлось отдельно поправить parser и fetch по RetailCRM, чтобы route не пытался трактовать такой payload как полный заказ.
- RetailCRM не принимает произвольный `limit` в list orders. Валидные значения: `20`, `50`, `100`.

## AI usage

AI использовался как технический помощник, а не как замена инженерных решений.

Что реально помогло:

- быстро разложить архитектуру на webhook, backfill и dashboard
- ускорить каркас TypeScript-файлов
- ускорить формулировку README и явных assumptions

Где AI ошибался или был неточным:

- по RetailCRM нельзя без проверки слепо доверять названиям фильтров и shape webhook payload
- AI изначально склонялся к слишком “общему” mapping до просмотра реального `mock_orders.json`
- anti-duplicate logic для Telegram в лоб через boolean недостаточно надёжна при гонке webhook + cron

Как это было исправлено:

- точки интеграции RetailCRM изолированы в одном client слое
- mapping опирается на фактический `mock_orders.json`
- для уведомлений добавлен atomic claim в Postgres, а не только boolean-флаг

## Self-review

Что получилось сильным:

- цельный full-stack repo вместо набора разрозненных частей
- server-side dashboard
- два sync-контура: webhook + backfill
- идемпотентность и защита от duplicate notifications

Что я бы усилил следующим шагом, если бы было ещё время:

- добавить интеграционный smoke test на sync core
- вынести dashboard aggregates в SQL view/RPC для больших объёмов
- точнее подстроить RetailCRM webhook parser под payload конкретного аккаунта
