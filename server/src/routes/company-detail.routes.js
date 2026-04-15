const router = require("express").Router();
const CompanyDetailController = require("../controllers/CompanyDetailController");
const { authenticateToken } = require("../middleware/verifyAccessToken");

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Поиск
router.get("/inn/:inn", CompanyDetailController.findByINN);
router.get("/account/:account", CompanyDetailController.findByCheckingAccount);

// Маршруты для реквизитов конкретного контрагента
router.get("/:counterpartyId", CompanyDetailController.getByCounterpartyId);
router.post("/:counterpartyId", CompanyDetailController.create);
router.put("/:counterpartyId", CompanyDetailController.update);
router.delete("/:counterpartyId", CompanyDetailController.delete);
router.get("/:counterpartyId/check", CompanyDetailController.hasDetails);

module.exports = router;
