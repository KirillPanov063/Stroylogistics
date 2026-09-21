# CLAUDE.md — Stroylogistics

Справочный документ по проекту для Claude. Описывает архитектуру, бизнес-логику и текущее состояние кода.

---

## Что это за проект

Внутренняя CRM-система логистической компании, которая занимается доставкой и забором мусорных контейнеров. Менеджеры создают заказы, назначают водителей или внешних подрядчиков-исполнителей, отслеживают оплату от клиентов и счета от исполнителей.

**Фронтенд ещё не написан.** Стек определён: React 19 + TypeScript + Vite + Redux Toolkit + React Router v7 + React Hook Form + Yup + Axios + Socket.io-client (порт 5173). Сейчас существует только бэкенд.

---

## Стек технологий

| Слой | Технология |
|------|-----------|
| Runtime | Node.js, CommonJS (`"type": "commonjs"`) |
| Фреймворк | Express.js 5 |
| БД | PostgreSQL |
| ORM | Sequelize 6 |
| Аутентификация | JWT (access + refresh) через httpOnly cookie |
| Хеширование паролей | bcrypt |
| Загрузка файлов | multer |
| Логирование запросов | morgan |
| Переменные окружения | dotenv |
| Email | nodemailer (SMTP, переключается через EMAIL_ENABLED) |
| Cron | node-cron (5 задач) |

**Фронтенд (не начат, стек определён):**

| Слой | Технология |
|------|-----------|
| Сборка | Vite 7, TypeScript 5.8 |
| UI-фреймворк | React 19 |
| Роутинг | React Router v7 |
| Стейт | Redux Toolkit 2 + React Redux 9 |
| Формы | React Hook Form 7 + Hookform Resolvers + Yup |
| HTTP | Axios |
| WebSocket | Socket.io-client 4 |
| Линтер | ESLint 9 + typescript-eslint |

---

## Запуск

```bash
cd server

# Инициализация БД с нуля
npm run db:init          # db:create + db:migrate + db:seed:all

# Отдельные команды
npm run db:mig           # только миграции
npm run db:mig:undo      # откат всех миграций
npm run db:seed          # только сидеры

# Запуск сервера
npm run dev              # nodemon (разработка)
npm start                # node (продакшн)

# Создать первого админа
npm run create-admin
```

Файл `.env` — в `server/.env`. При отсутствии сервер не стартует.

---

## Переменные окружения (server/.env)

```
DB=postgres://postgres:ПАРОЛЬ@localhost:5432/Stroylogistics
PORT=3000
CLIENT_URL=http://localhost:5173
SECRET_ACCESS_TOKEN=...   # 128-символьный hex
SECRET_REFRESH_TOKEN=...  # 128-символьный hex

EMAIL_ENABLED=true        # false — все письма пропускаются (лог в консоль)
SMTP_HOST=smtp.mail.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@mail.ru
SMTP_PASS=your-app-password   # пароль для внешних приложений, не основной
SMTP_FROM="Stroylogistics <your-email@mail.ru>"
```

**mail.ru**: в настройках почты → Безопасность → "Пароли для внешних приложений" — создать отдельный пароль.

---

## Структура бэкенда

```
server/
├── src/
│   ├── app.js                          # Точка входа, Express + graceful shutdown + cron
│   ├── config/
│   │   ├── serverConfig.js             # CORS, morgan, cookie-parser, securityHeaders
│   │   ├── cookieConfig.js             # Настройки httpOnly cookie для refresh-токена
│   │   └── jwtConfig.js                # Время жизни токенов
│   ├── routes/
│   │   ├── index.router.js             # Подключает все роуты под /api
│   │   ├── auth.router.js              # /api/auth/...
│   │   ├── user.router.js              # /api/users/...
│   │   ├── driver.routes.js            # /api/drivers/...
│   │   ├── counterparty.routes.js      # /api/counterparties/...
│   │   ├── order.routes.js             # /api/orders/...
│   │   ├── company-detail.routes.js    # /api/company-details/...
│   │   ├── object.routes.js            # /api/objects/...
│   │   ├── relationship.routes.js      # /api/relationships/...
│   │   ├── documentRoutes.js           # /api/documents/...
│   │   ├── executorInvoiceRoutes.js    # /api/orders/:id/executor-invoice
│   │   ├── priceRoutes.js              # /api/counterparties/:id/prices
│   │   ├── salary.routes.js            # /api/salary/...
│   │   └── wasteReceiver.routes.js     # /api/waste-receivers/...
│   ├── controllers/
│   ├── services/
│   ├── cron/
│   │   └── index.js                    # 5 cron-задач (запускаются при старте сервера)
│   ├── db/
│   │   ├── models/                     # Sequelize модели
│   │   ├── migrations/                 # 20+ миграций
│   │   ├── seeders/
│   │   └── config/database.json
│   ├── middleware/
│   │   ├── verifyAccessToken.js        # JWT-проверка + authorizeRoles()
│   │   ├── verifyRefreshToken.js
│   │   ├── checkBody.js
│   │   ├── forceLogout.js
│   │   ├── securityHeaders.js
│   │   └── validation/
│   └── utils/
│       ├── formatResponse.js
│       ├── generateJWTTokens.js
│       └── formatPhone.js
├── scripts/
│   └── create-admin.js
└── src/uploads/
    ├── documents/
    ├── photos/       # фото выполнения и накладных от водителей
    └── temp/
```

---

## База данных — таблицы и связи

### users
Сотрудники компании (менеджеры, админы, водители как пользователи).
- Роли: `user`, `admin`, `manager`, `driver`
- Поля: `email` (unique), `phone` (unique), `password_hash`, `full_name`, `role`, `is_active`
- Email-верификация: `email_verified`, `verification_code` (6 цифр), `verification_code_expires_at` (TTL 10 мин)

### drivers
Водители компании. Могут быть связаны с `users` через `user_id` (необязательно).
- Типы: `company` (штатный), `external` (внешний)
- Хранит данные о транспорте: `vehicle_license_plate`, `vehicle_model`, `vehicle_year`
- Документы с датами истечения: техосмотр (`inspection_date`), пропуск (`permit_valid_until`), страховка (`insurance_valid_until`)
- Флаги уведомлений: `inspection_notified`, `permit_notified`, `insurance_notified`

### counterparties
Контрагенты — клиенты и/или исполнители (внешние подрядчики).
- Тип: `client`, `executor`, `both`
- Тип лица: `individual` (физлицо), `llc` (ООО), `entrepreneur` (ИП)
- Цены: `default_prices` (JSONB), `price_history` (JSONB), `default_payment_type`

**Структура `default_prices`:**
```json
{
  "invoice_with_vat":    { "8m3": 16000, "20m3": 33000, "27m3": 38000 },
  "invoice_without_vat": { "8m3": 13500, "20m3": 27500, "27m3": 32000 },
  "card_transfer":       { "8m3": 14000, "20m3": 29000, "27m3": 34000 },
  "cash":                { "8m3": 14000, "20m3": 29000, "27m3": 34000 },
  "default_payment_type": "invoice_with_vat"
}
```

### company_details
Реквизиты контрагента (1:1 с counterparty). Содержит ИНН, КПП, ОГРН, расчётный счёт, банк, адрес, руководитель.

### objects
Объекты (адреса доставки) контрагента. У одного клиента может быть несколько объектов.

### relationships
Связи между клиентами и исполнителями. Уникальная пара `(client_id, executor_id)`. Хранит номер и дату договора.

### waste_receivers
Компании-приёмщики мусора (полигоны). Всегда юр. лицо (`person_type = 'llc'`, поле фиксировано).
- `name`, `phone`, `email`, `representative_name`
- `contract_number`, `contract_date` — реквизиты договора
- `price_per_m3` — текущая цена сдачи за 1 м³
- `price_history` (JSONB) — история изменений цены: `[{price_per_m3, changed_at, changed_by, note}]`
- `notes`, `is_active`
- При обновлении цены (`PATCH /price`) старое значение автоматически пишется в `price_history`

### waste_receiver_addresses
Адреса сгрузки (несколько на один полигон).
- `waste_receiver_id` FK → waste_receivers
- `address`, `name` (название площадки), `contact_person`, `contact_phone`, `working_hours`, `is_active`

### orders
Центральная таблица. Заказ на доставку/забор контейнера.

**Ключевые бизнес-правила:**
- Либо `driver_id`, либо `executor_id` — никогда оба одновременно
- Если водитель (штатный): `executor_amount = 0`, `commission_amount = 0`
- Если исполнитель (внешний): `client_amount = executor_amount + commission_amount`
- `payment_amount` — дублирует `client_amount` (поле обратной совместимости, синхронизируется хуком)

**Статусы и переходы:**
```
draft → processing → assigned → in_transit → driver_done → paid → completed
                                           ↘                ↗
                                            paid (для заказов с исполнителем)
  └──────────────────────────────────────────────────────────────→ cancelled
```
- `driver_done` — водитель отправил отчёт. Только для заказов со штатным водителем.
- `completed` — финальный статус: водитель выполнил **И** оплата получена.
- `in_transit → paid` — путь для заказов с внешним исполнителем (без отчёта водителя).
- `driver_completed_at` — timestamp отправки отчёта водителем.

**Действия с контейнером:** `install` (постановка), `pickup` (забор), `loading` (загрузка), `replace` (замена), `roll` (откатать)
**Объём:** `8m3`, `20m3`, `27m3`
**Тип оплаты:** `invoice_with_vat`, `invoice_without_vat`, `card_transfer`, `cash`
**Формат оплаты:** `single` (разовый), `prepaid` (пакет доставок)

**Поля отчёта водителя (заполняются через `POST /api/orders/:id/driver-report`):**
- `completion_photo` — фото выполнения
- `waybill_photo` — фото накладной (обязательно для юр. лиц с оплатой по счёту)
- `installed_container_number` — номер установленного контейнера
- `picked_up_container_number` — номер забранного контейнера
- `waste_receiver_id` — полигон сгрузки (обязателен для: pickup, loading, replace, roll)
- `waste_receiver_address_id` — конкретная площадка на полигоне (опционально)
- `driver_completed_at` — проставляется автоматически при переходе в `driver_done`

**Требования отчёта водителя по действию:**

| Действие | Фото | Номер уст. | Номер забр. | Полигон |
|---|---|---|---|---|
| `install` (постановка) | ✅ | ✅ | — | — |
| `pickup` (забор) | ✅ | — | ✅ | ✅ |
| `loading` (загрузка) | ✅ | — | — | ✅ |
| `replace` (замена) | ✅ | ✅ | ✅ | ✅ |
| `roll` (откатать) | ✅ | — | — | ✅ |

**Счёт от исполнителя (`executor_invoice_*`):**
- `executor_invoice_status`: `not_received → received → verified → paid` (+ `rejected`)

**Счёт клиенту (`client_invoice_*`, выставляется через 1С):**
- `client_payment_status`: `not_paid`, `partially_paid`, `paid`, `overdue`

**Поля расчётов:**
- `executor_payment_method` — как платим исполнителю
- `client_amount_net` / `executor_amount_net` — нетто после НДС
- `income_recipient_user_id` — сотрудник, принявший наличные/карту (→ зарплата)
- `is_loss_acknowledged` — менеджер подтвердил убыточность
- `distance_multiplier` — коэффициент дальности для штатного водителя (1.0 / 1.5 / 2.0)
- `payment_flow` — `direct` (клиент платит компании) / `executor_collects` (исполнитель собирает, отдаёт комиссию)
- `waste_receiver_id` / `waste_receiver_address_id` — полигон сгрузки (заполняется водителем в отчёте)

### salary_accruals
Начисления зарплаты водителям.
- `accrual_type`: `order_wage` (за рейс) / `base_work` (работа на базе)
- `order_wage`: сумма = `DRIVER_RATES[container_volume][container_action]` × `distance_multiplier`
- `base_work`: сумма = `days_count` × `daily_rate` (по умолчанию 5000 ₽/день)
- Создаётся автоматически при переходе заказа в `completed`
- Только для штатных водителей с `user_id`

**Ставки водителей (DRIVER_RATES):**

| | install | pickup | loading | replace | roll |
|---|---|---|---|---|---|
| `8m3` | 750 | 750 | 1500 | 1500 | 2250 |
| `20m3` | 1100 | 1100 | 2200 | 2200 | 3300 |
| `27m3` | 1100 | 1100 | 2200 | 2200 | 3300 |

### documents
Файлы, прикреплённые к заказам/контрагентам/объектам/полигонам.
- `waste_receiver_id` — привязка к компании-приёмщику (договора с полигоном)
- Мягкое удаление через `deleted_at` + `deleted_by`

---

## Аутентификация

**JWT access + refresh через httpOnly cookie**

1. `POST /api/auth/signup` → создаёт неактивного пользователя (`is_active: false`, `email_verified: false`), отправляет 6-значный код на email (TTL 10 мин). Возвращает `{email, email_sent}`, токены НЕ выдаются.
2. `POST /api/auth/verify-email` `{email, code}` → активирует пользователя, возвращает токены.
3. `POST /api/auth/resend-code` `{email}` → повторно отправляет код.
4. `POST /api/auth/signin` → проверяет `email_verified`, при `false` → HTTP 403 `{code: "EMAIL_NOT_VERIFIED"}`.
5. Защищённые роуты: заголовок `Authorization: Bearer <accessToken>`.
6. `POST /api/auth/refresh` — обновление токенов через httpOnly cookie.
7. `verifyAccessToken.js` — middleware, кладёт пользователя в `res.locals.user`.
8. `authorizeRoles(...roles)` — именованный экспорт из `verifyAccessToken.js`.

---

## Формат API-ответов

```json
{ "success": true, "message": "...", "data": {...} }
{ "success": false, "message": "...", "error": "...", "statusCode": 400 }
```

---

## Пагинация (getAll заказов)

`GET /api/orders?page=1&limit=50` → `{ data: [...], pagination: { total, page, limit, total_pages } }`
Лимит: 1–100, по умолчанию 50.

---

## Бизнес-логика — ключевые сервисы

### OrderService
- `validateOrderData()` — валидация (водитель vs исполнитель, арифметика комиссии, payment_flow)
- `create()` — автоподстановка `client_amount` из прайса клиента, автовычисление комиссии, расчёт нетто, проверка прибыльности
- `update()` — переходы статуса, пересчёт нетто; при `completed` → `SalaryService.accrueForOrder()`
- `updateStatus()` — обёртка над update для смены статуса
- `getAll(filters)` — список с фильтрацией и пагинацией
- `getStats(filters)` — статистика за период
- `getOrderChain(id)` — цепочка связанных заказов

### WasteReceiverService
- `getAll({includeInactive})` — список полигонов с активными адресами
- `getById(id)` — карточка со всеми адресами и документами
- `create(data)` — `person_type` всегда `llc`, не принимается от клиента
- `update(id, data)` — обновление основных данных
- `updatePrice(id, newPricePerM3, changedByUserId, note)` — новая цена + старая пишется в `price_history`
- `delete(id)` — деактивация (`is_active = false`)
- `addAddress(receiverId, data)` / `updateAddress(...)` / `deleteAddress(...)` — управление площадками

### SalaryService
- `calcNet(amount, paymentMethod)` — нетто: `amount × 0.78` для `invoice_with_vat`, иначе `amount`
- `checkProfitability(...)` — сценарии 4 и 5; возвращает `{isLoss, profit_loss, ...}`
- `accrueForOrder(orderId, managerId)` — создаёт запись `order_wage` для штатного водителя с `user_id` при переходе в `completed`. Сумма = `DRIVER_RATES[volume][action] × distance_multiplier`. Идемпотентен — повторный вызов игнорируется.
- `accrueBaseWork(userId, daysCount, rate, period, accruedBy)` — ручное начисление `base_work`: `days_count × daily_rate`
- `getReport(period, userId?)` — отчёт за месяц по сотрудникам
- `markAsPaid(accrualIds, paidAt?)` — отметить выплаченными

### PriceService
- `getPriceForCustomer(counterpartyId, volume, paymentType)` — цена из прайса клиента (не пишет историю)
- `updatePrices(counterpartyId, newPrices, changedBy)` — обновляет прайс + история
- `validatePriceStructure(prices)` — проверяет 4 типа × 3 объёма

### ExecutorInvoiceService
- `uploadInvoice()` / `verifyInvoice()` / `markAsPaid()` — цикл обработки счёта от исполнителя

### EmailService (nodemailer)
- `send(to, subject, html)` — базовый метод, пропускает если `EMAIL_ENABLED=false`
- `sendVerificationCode(email, fullName, code)` — код подтверждения регистрации
- `sendDriverDocExpiry(...)` / `sendPickupReminder(...)` / `sendPaymentReminder(...)` / `sendMissingInvoiceAlert(...)` / `sendSalaryReport(...)`

### NotificationService
Вспомогательный, используется cron-задачами: находит водителей с истекающими документами, заказы с напоминаниями, неоплаченные заказы, отсутствующие счета.

---

## Cron-задачи (5 штук, запускаются при старте в app.js)

| Время | Задача |
|---|---|
| 09:00 | Документы водителей — уведомление за 30 дней до истечения |
| 09:00 | Напоминания о заборе контейнера (`pickup_reminder_date = сегодня`) |
| 10:00 | Неоплаченные заказы — регулярное (3 дня) и срочное (7 дней) |
| 11:00 | Не получен счёт от исполнителя (3+ дня после завершения) |
| 08:00 | Зарплатный отчёт (только в последний день месяца) |

---

## Сценарии оплаты и расчёт НДС

**НДС = 22%. Нетто = сумма × 0.78.** Применяется только к `invoice_with_vat`.

| № | Клиент платит | Мы платим исполнителю | Поведение |
|---|---|---|---|
| 1 | `invoice_with_vat` | любой | `client_amount_net = client_amount × 0.78` |
| 2 | `cash` | — (штатный водитель) | наличные → водителю в ЗП |
| 3 | `card_transfer` | — (штатный водитель) | перевод → указанному сотруднику в ЗП |
| 4 | `cash`/`card_transfer` | `invoice_with_vat` | ⚠️ если `client_amount < executor_amount × 0.78` |
| 5 | `invoice_with_vat` | `cash`/`card_transfer` | ⚠️ если `client_amount × 0.78 < executor_amount` |

**Убыточная операция (сценарии 4, 5):** HTTP 422 `{type: "LOSS_WARNING", details: {...}}`. Повторный запрос с `is_loss_acknowledged: true` сохраняет заказ.

**Сценарий 6 — `executor_collects`:** исполнитель забирает всю сумму у клиента и перечисляет нам только комиссию. Поле `payment_flow = 'executor_collects'` доступно только при назначенном исполнителе.

---

## API заказов (`/api/orders`)

- `GET /` — список с фильтрацией (`status`, `customerId`, `driverId`, `executorId`, `dateFrom`, `dateTo`, `page`, `limit`)
- `GET /stats/overview` — статистика за период
- `GET /:id` — заказ по ID с вложенными данными
- `GET /customer/:customerId` — заказы клиента
- `GET /driver/:driverId` — заказы водителя
- `GET /executor/:executorId` — заказы исполнителя
- `GET /:id/chain` — цепочка связанных заказов
- `POST /` — создать (admin, manager)
- `PUT /:id` — обновить (admin, manager)
- `PATCH /:id/status` — сменить статус (admin, manager)
- `PATCH /:id/driver` — назначить водителя (admin, manager)
- `PATCH /:id/executor` — назначить исполнителя (admin, manager)
- `POST /:id/driver-report` — отчёт водителя (driver, admin, manager); multipart/form-data, поля: `photo`, `waybill_photo`, `installed_container_number`, `picked_up_container_number`, `waste_receiver_id`, `waste_receiver_address_id` → статус `driver_done`
- `PATCH /:id/payment-confirmation` — подтверждение оплаты (admin, manager)
- `DELETE /:id` — удалить (admin)

---

## API компаний-приёмщиков (`/api/waste-receivers`)

- `GET /` — список (query: `includeInactive=true`)
- `POST /` — создать (admin, manager)
- `GET /:id` — карточка с адресами и документами
- `PUT /:id` — обновить данные (admin, manager)
- `PATCH /:id/price` — обновить цену за м³, body: `{price_per_m3, note}` (admin, manager)
- `DELETE /:id` — деактивировать (admin)
- `POST /:id/addresses` — добавить адрес площадки
- `PUT /:id/addresses/:addressId` — обновить адрес
- `DELETE /:id/addresses/:addressId` — деактивировать адрес

---

## API зарплаты (`/api/salary`)

- `GET /report?period=2026-05` — отчёт за месяц (admin, manager)
- `POST /pay` — выплатить: `{accrual_ids: [...], paid_at: "2026-05-31"}`
- `POST /base-work` — начислить за работу на базе: `{user_id, days_count, daily_rate?, period?}`

---

## Миграции (порядок выполнения)

1. `20260304200040-create-user`
2. `20260304200042-create-drivers`
3. `20260311131041-create-counterparties`
4. `20260311131104-create-company-details`
5. `20260311131121-create-objects`
6. `20260311131139-create-relationships`
7. `20260312163303-create-orders`
8. `20260414162343-add-prices-to-counterparties`
9. `20260414162414-create-documents`
10. `20260414185027-add-invoice-fields-to-orders`
11. `20260415101104-add-missing-fields-to-documents`
12. `20260505100000-add-payment-fields-to-orders` — executor_payment_method, net-суммы, income_recipient_user_id, is_loss_acknowledged
13. `20260505100001-create-salary-accruals`
14. `20260506100000-add-email-verification-to-users`
15. `20260506110000-add-distance-multiplier-to-orders`
16. `20260506120000-driver-salary-refactor` — добавляет `roll` в enum действий, делает payment_method nullable в salary_accruals
17. `20260506130000-extend-driver-salary` — accrual_type, days_count, daily_rate в salary_accruals
18. `20260506140000-add-payment-flow-to-orders`
19. `20260506150000-add-driver-done-status` — статус `driver_done` + `driver_completed_at` в orders
20. `20260506160000-add-waybill-photo-to-orders` — `waybill_photo` в orders
21. `20260506170000-create-waste-receivers`
22. `20260506170001-create-waste-receiver-addresses`
23. `20260506170002-add-waste-receiver-to-documents`
24. `20260506180000-add-waste-receiver-to-orders` — `waste_receiver_id` + `waste_receiver_address_id` в orders

---

## Важные особенности кода

- **Валидация заказов** живёт только в `OrderService`. Хук `beforeValidate` в модели `Order` только синхронизирует `client_amount ↔ payment_amount`.
- **`payment_amount`** — дубликат `client_amount` для обратной совместимости. Использовать `client_amount`.
- **UUID** — все PK, кроме `order_number` (INTEGER, PostgreSQL sequence).
- **Multer** — файлы в `src/uploads/`. Фото водителей → `uploads/photos/`, документы → `uploads/documents/`, временные → `uploads/temp/`.
- **`authorizeRoles`** — именованный экспорт из `verifyAccessToken.js` (не default).
- **`sequelize.sync()`** только в `development` с `alter: false`. Схема — только через миграции.
- **`default_payment_type`** — хранится как колонка в `counterparties` И внутри JSONB `default_prices`. Использовать из JSONB.
- **Email** при регистрации обёрнут в try/catch — если SMTP упал, пользователь всё равно создаётся, в ответе `email_sent: false`.
- **`person_type` в waste_receivers** — всегда `llc`, проставляется автоматически, не принимается от клиента.

---

## Что не реализовано

| Функция | Статус |
|---------|--------|
| Фронтенд (React 19 + TS + Vite) | Стек определён, код не написан |
| Socket.io (пакет установлен) | Не подключён |
| Swagger / документация API | Не реализована |
| Docker / CI/CD | Не реализованы |
| Логгер (winston/pino) | Используется console.error |
| Журнал уведомлений (NotificationLog) | Нет таблицы |
| Аудит заказов (OrderAuditLog) | Нет таблицы |
| Интеграция с 1С | Счета приходят вручную |
| Redis-кэширование | Не реализовано |
| Тестовый фреймворк | Есть test/full-test.js (39 тестов), Jest не настроен |

---

## Фронтенд — архитектурные соглашения

Клиентская часть будет располагаться в папке `client/` (рядом с `server/`). Порт dev-сервера: **5173**.

### Структура (планируемая)

```
client/
├── src/
│   ├── app/
│   │   ├── store.ts              # Redux store
│   │   └── hooks.ts              # useAppDispatch, useAppSelector
│   ├── features/                 # Слайсы RTK по доменам
│   │   ├── auth/
│   │   ├── orders/
│   │   ├── counterparties/
│   │   ├── drivers/
│   │   ├── salary/
│   │   └── wasteReceivers/
│   ├── pages/                    # Страницы (роуты)
│   ├── components/               # Переиспользуемые компоненты
│   ├── api/                      # Axios-инстанс + типизированные запросы
│   │   └── axios.ts              # baseURL = /api, withCredentials: true
│   └── router/                   # React Router v7 конфиг
```

### Ключевые соглашения

- **Redux Toolkit**: один слайс на домен в `features/`. Async-логика через `createAsyncThunk`. RTK Query не используется — запросы через Axios вручную.
- **React Hook Form + Yup**: все формы через `useForm`, схема валидации отдельным файлом `*.schema.ts`.
- **Axios**: инстанс с `baseURL = http://localhost:3000/api` и `withCredentials: true` (для передачи refresh-cookie). Интерцептор на 401 → обновление токена через `POST /auth/refresh`.
- **React Router v7**: файловая структура роутов в `pages/`, вложенные роуты через `<Outlet>`.
- **Socket.io-client**: подключается после авторизации, отключается при логауте. Бэкенд пакет установлен, но логика не реализована.
- **TypeScript**: строгий режим (`strict: true`). Типы API-ответов описываются в `features/*/types.ts`.
- **JWT**: access-токен хранится в памяти (Redux state), refresh-токен — в httpOnly cookie (устанавливает бэкенд автоматически). Не хранить токены в localStorage.
