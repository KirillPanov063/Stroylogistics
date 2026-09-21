const router = require("express").Router();
const WasteReceiverController = require("../controllers/WasteReceiverController");
const { authenticateToken, authorizeRoles } = require("../middleware/verifyAccessToken");
const checkBody = require("../middleware/checkBody");

router.use(authenticateToken);

// Список компаний-приёмщиков
router.get("/", WasteReceiverController.getAll);

// Получить по ID (со всеми адресами и документами)
router.get("/:id", WasteReceiverController.getById);

// Создать компанию-приёмщик
router.post("/", authorizeRoles("admin", "manager"), checkBody, WasteReceiverController.create);

// Обновить основные данные
router.put("/:id", authorizeRoles("admin", "manager"), checkBody, WasteReceiverController.update);

// Обновить цену за м³ (с записью в историю)
router.patch("/:id/price", authorizeRoles("admin", "manager"), checkBody, WasteReceiverController.updatePrice);

// Деактивировать компанию
router.delete("/:id", authorizeRoles("admin"), WasteReceiverController.delete);

// ============= АДРЕСА =============

// Добавить адрес
router.post("/:id/addresses", authorizeRoles("admin", "manager"), checkBody, WasteReceiverController.addAddress);

// Обновить адрес
router.put("/:id/addresses/:addressId", authorizeRoles("admin", "manager"), checkBody, WasteReceiverController.updateAddress);

// Деактивировать адрес
router.delete("/:id/addresses/:addressId", authorizeRoles("admin", "manager"), WasteReceiverController.deleteAddress);

module.exports = router;
