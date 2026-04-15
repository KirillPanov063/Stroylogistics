const router = require("express").Router();
const ObjectController = require("../controllers/ObjectController");
const { authenticateToken } = require("../middleware/verifyAccessToken");
const checkBody = require("../middleware/checkBody");

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Глобальная статистика
router.get("/stats/global", ObjectController.getGlobalStats);

// Поиск
router.get("/search/address/:address", ObjectController.searchByAddress);
router.get(
  "/search/person/:person",
  ObjectController.searchByResponsiblePerson,
);
router.get("/search/phone/:phone", ObjectController.searchByResponsiblePhone);

// Основные CRUD маршруты для объектов
router.get("/", ObjectController.getAll);
router.get("/:id", ObjectController.getById);
router.post("/", checkBody, ObjectController.create);
router.put("/:id", checkBody, ObjectController.update);
router.patch("/:id/deactivate", ObjectController.deactivate);
router.patch("/:id/activate", ObjectController.activate);
router.delete("/:id", ObjectController.delete);

// Копирование объекта
router.post("/:id/duplicate", ObjectController.duplicate);

module.exports = router;
