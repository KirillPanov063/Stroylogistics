const router = require("express").Router();
const DriverController = require("../controllers/DriverController");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/verifyAccessToken");
const checkBody = require("../middleware/checkBody");

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// ============= ПУБЛИЧНЫЕ МАРШРУТЫ (для всех авторизованных) =============

// Получение всех водителей с фильтрацией
router.get("/", DriverController.getAll);

// Получение водителя по ID
router.get("/:id", DriverController.getById);

// Поиск по госномеру
router.get(
  "/search/plate/:licensePlate",
  DriverController.searchByLicensePlate,
);

// Получение водителей по типу
router.get("/type/:type", DriverController.getByType);

// ============= МАРШРУТЫ ДЛЯ АДМИНА И МЕНЕДЖЕРА =============

// Статистика по водителям
router.get(
  "/stats/overview",
  authorizeRoles("admin", "manager"),
  DriverController.getStats,
);

// Водители с истекающими документами
router.get(
  "/expiring/documents",
  authorizeRoles("admin", "manager"),
  DriverController.getExpiringDocuments,
);

// Свободные водители
router.get(
  "/available/now",
  authorizeRoles("admin", "manager"),
  DriverController.getAvailableDrivers,
);

// Создание нового водителя
router.post(
  "/",
  authorizeRoles("admin", "manager"),
  checkBody,
  DriverController.create,
);

// Обновление водителя
router.put(
  "/:id",
  authorizeRoles("admin", "manager"),
  checkBody,
  DriverController.update,
);

// Деактивация водителя
router.patch(
  "/:id/deactivate",
  authorizeRoles("admin", "manager"),
  DriverController.deactivate,
);

// Активация водителя
router.patch(
  "/:id/activate",
  authorizeRoles("admin", "manager"),
  DriverController.activate,
);

// Отметка об уведомлении (для системы)
router.patch(
  "/:id/notify",
  authorizeRoles("admin", "manager"),
  DriverController.markNotified,
);

// ============= МАРШРУТЫ ДЛЯ ВОДИТЕЛЯ =============

// Профиль текущего водителя (для авторизованного пользователя-водителя)
router.get(
  "/profile/me",
  authorizeRoles("driver"),
  DriverController.getCurrentDriver,
);

// ============= МАРШРУТЫ ТОЛЬКО ДЛЯ АДМИНА =============

// Удаление водителя
router.delete("/:id", authorizeRoles("admin"), DriverController.delete);

module.exports = router;
