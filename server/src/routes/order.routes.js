const router = require("express").Router();
const OrderController = require("../controllers/OrderController");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/verifyAccessToken");
const checkBody = require("../middleware/checkBody");

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// ============= ПУБЛИЧНЫЕ МАРШРУТЫ (для всех авторизованных) =============

// Получение всех заказов с фильтрацией
router.get("/", OrderController.getAll);

// Статистика по заказам
router.get("/stats/overview", OrderController.getStats);

// Получение заказов для напоминаний
router.get("/reminders/today", OrderController.getOrdersForReminders);

// Получение заказов клиента
router.get("/customer/:customerId", OrderController.getByCustomer);

// Получение заказов водителя
router.get("/driver/:driverId", OrderController.getByDriver);

// Получение заказов исполнителя
router.get("/executor/:executorId", OrderController.getByExecutor);

// Получение цепочки связанных заказов
router.get("/:id/chain", OrderController.getOrderChain);

// Поиск заказов по адресу
router.get("/search/address/:address", OrderController.searchByAddress);

// Поиск заказов по номеру
router.get("/search/number/:orderNumber", OrderController.searchByNumber);

// Получение заказа по ID - ДОЛЖНО БЫТЬ ПОСЛЕ ВСЕХ СПЕЦИАЛЬНЫХ МАРШРУТОВ
router.get("/:id", OrderController.getById);

// ============= МАРШРУТЫ ДЛЯ СОТРУДНИКОВ (менеджеры и админы) =============

// Создание нового заказа
router.post(
  "/",
  authorizeRoles("admin", "manager"),
  checkBody,
  OrderController.create,
);

// Обновление заказа
router.put(
  "/:id",
  authorizeRoles("admin", "manager"),
  checkBody,
  OrderController.update,
);

// Обновление статуса заказа
router.patch(
  "/:id/status",
  authorizeRoles("admin", "manager"),
  OrderController.updateStatus,
);

// Назначение водителя
router.patch(
  "/:id/driver",
  authorizeRoles("admin", "manager"),
  OrderController.assignDriver,
);

// Назначение исполнителя
router.patch(
  "/:id/executor",
  authorizeRoles("admin", "manager"),
  OrderController.assignExecutor,
);

// Добавление фото выполнения
router.patch(
  "/:id/completion-photo",
  authorizeRoles("admin", "manager", "driver"),
  OrderController.addCompletionPhoto,
);

// Добавление подтверждения оплаты
router.patch(
  "/:id/payment-confirmation",
  authorizeRoles("admin", "manager"),
  OrderController.addPaymentConfirmation,
);

// Использование предоплаченной доставки
router.post(
  "/:id/use-prepaid",
  authorizeRoles("admin", "manager"),
  OrderController.usePrepaidDelivery,
);

// Отметка об уведомлении о последней доставке
router.patch(
  "/:id/last-delivery-notified",
  authorizeRoles("admin", "manager"),
  OrderController.markLastDeliveryNotified,
);

// ============= АДМИН-МАРШРУТЫ =============

// Удаление заказа (только для админов)
router.delete("/:id", authorizeRoles("admin"), OrderController.delete);

module.exports = router;
