const router = require("express").Router();
const RelationshipController = require("../controllers/RelationshipController");
const { authenticateToken } = require("../middleware/verifyAccessToken");
const checkBody = require("../middleware/checkBody");

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Глобальная статистика
router.get("/stats/global", RelationshipController.getGlobalStats);

// Специальные выборки
router.get("/expiring", RelationshipController.getExpiringContracts);
router.get("/without-contract", RelationshipController.getWithoutContract);

// Поиск
router.get(
  "/contract/:contractNumber",
  RelationshipController.searchByContractNumber,
);
router.get("/date/:date", RelationshipController.searchByContractDate);
router.get("/type/:type", RelationshipController.getByType);

// Основные CRUD маршруты
router.get("/", RelationshipController.getAll);
router.get("/:id", RelationshipController.getById);
router.post("/", checkBody, RelationshipController.create);
router.put("/:id", checkBody, RelationshipController.update);
router.patch("/:id/deactivate", RelationshipController.deactivate);
router.patch("/:id/activate", RelationshipController.activate);
router.delete("/:id", RelationshipController.delete);

// Проверка наличия связи
router.get(
  "/check/:clientId/:executorId",
  RelationshipController.hasActiveRelationship,
);

// Маршруты для клиента
router.get("/client/:clientId", RelationshipController.getByClientId);
router.get(
  "/client/:clientId/executors",
  RelationshipController.getClientExecutors,
);
router.get("/client/:clientId/stats", RelationshipController.getClientStats);

// Маршруты для исполнителя
router.get("/executor/:executorId", RelationshipController.getByExecutorId);
router.get(
  "/executor/:executorId/clients",
  RelationshipController.getExecutorClients,
);
router.get(
  "/executor/:executorId/stats",
  RelationshipController.getExecutorStats,
);

module.exports = router;
