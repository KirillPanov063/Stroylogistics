const router = require("express").Router();
const CounterpartyController = require("../controllers/CounterpartyController");
const ObjectController = require("../controllers/ObjectController");
const { authenticateToken } = require("../middleware/verifyAccessToken");
const checkBody = require("../middleware/checkBody");

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Основные CRUD маршруты
router.get("/", CounterpartyController.getAll);
router.get("/search", CounterpartyController.searchAll);
router.get("/phone/:phone", CounterpartyController.findByPhone);
router.get("/email/:email", CounterpartyController.findByEmail);
router.get("/inn/:inn", CounterpartyController.findByINN);
router.get("/company/:name", CounterpartyController.findByCompanyName);
router.get(
  "/representative/:name",
  CounterpartyController.findByRepresentativeName,
);
router.get("/:id", CounterpartyController.getById);

router.post("/", checkBody, CounterpartyController.create);

router.put("/:id", checkBody, CounterpartyController.update);
router.patch("/:id/deactivate", CounterpartyController.deactivate);
router.patch("/:id/activate", CounterpartyController.activate);
router.delete("/:id", CounterpartyController.delete);

// Маршруты для объектов контрагента
router.get("/:counterpartyId/objects", ObjectController.getByCounterpartyId);
router.post("/:counterpartyId/objects", checkBody, ObjectController.create);
router.get(
  "/:counterpartyId/objects/stats",
  ObjectController.getCounterpartyStats,
);
router.patch(
  "/:counterpartyId/objects/bulk-status",
  ObjectController.bulkUpdateStatus,
);
router.get(
  "/:counterpartyId/objects/has-active",
  ObjectController.hasActiveObjects,
);

module.exports = router;
