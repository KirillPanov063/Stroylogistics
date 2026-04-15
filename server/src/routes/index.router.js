const indexRouter = require("express").Router();
const formatResponse = require("../utils/formatResponse");

// Импорт роутов аутентификация
const authRouter = require("./auth.router"); // Аутентификация: регистрация, вход, выход
const userRouter = require("./user.router"); // Пользователи системы: профиль, управление

// Импорт роутов для контрагентов
const counterpartyRouter = require("./counterparty.routes"); // Контрагенты (клиенты, исполнители, физлица)
const companyDetailRouter = require("./company-detail.routes"); // Реквизиты компаний (юрлица и ИП)
const objectRouter = require("./object.routes"); // Объекты/адреса контрагентов
const relationshipRouter = require("./relationship.routes"); // Связи между клиентами и исполнителями

// Импорт роута для заказов
const orderRouter = require("./order.routes"); // Заказы: создание, управление, статусы

// Импорт роута для водителей
const driverRouter = require("./driver.routes");

// ============= НОВЫЕ РОУТЫ ДЛЯ ЦЕН И ДОКУМЕНТОВ =============
const priceRouter = require("./priceRoutes"); // Цены: расчет, обновление, история цен
const executorInvoiceRouter = require("./executorInvoiceRoutes"); // Счета от исполнителей: регистрация, проверка, оплата
const documentRouter = require("./documentRoutes"); // Документы: загрузка, хранение, управление

// Подключаем роуты
indexRouter.use("/auth", authRouter); // /api/auth - аутентификация
indexRouter.use("/users", userRouter); // /api/users - управление пользователями

// Подключаем роуты реквизиты контрагенты
indexRouter.use("/counterparties", counterpartyRouter); // /api/counterparties - работа с контрагентами
indexRouter.use("/company-details", companyDetailRouter); // /api/company-details - реквизиты компаний
indexRouter.use("/objects", objectRouter); // /api/objects - объекты контрагентов
indexRouter.use("/relationships", relationshipRouter); // /api/relationships - связи между контрагентами

// Подключаем роут заказов
indexRouter.use("/orders", orderRouter); // /api/orders - управление заказами

// Подключаем роут водителей
indexRouter.use("/drivers", driverRouter); // /api/drivers - управление водителями

// ============= ПОДКЛЮЧАЕМ НОВЫЕ РОУТЫ =============
indexRouter.use("/prices", priceRouter); // /api/prices - управление ценами контрагентов
indexRouter.use("/executor-invoices", executorInvoiceRouter); // /api/executor-invoices - счета от исполнителей
indexRouter.use("/documents", documentRouter); // /api/documents - управление документами

// Health check - проверка работоспособности сервера
indexRouter.get("/health", (req, res) => {
  res.json(
    formatResponse.success("Server is running", {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }),
  );
});

// Обработка 404 - маршрут не найден
indexRouter.use((req, res) => {
  res
    .status(404)
    .json(formatResponse.notFound(`Маршрут ${req.originalUrl} не найден`));
});

module.exports = indexRouter;
