// routes/priceRoutes.js

const express = require("express");
const router = express.Router();
const priceController = require("../controllers/priceController");
const {
  validatePriceCalculation,
  validatePriceUpdate,
} = require("../middleware/validation/priceValidation");

// GET /api/prices/calculate - рассчитать цену
router.get(
  "/calculate",
  validatePriceCalculation,
  priceController.calculatePrice,
);

// GET /api/prices/:counterparty_id - получить все цены контрагента
router.get("/:counterparty_id", priceController.getPrices);

// GET /api/prices/:counterparty_id/history - получить историю цен
router.get("/:counterparty_id/history", priceController.getPriceHistory);

// PUT /api/prices/:counterparty_id - обновить цены
router.put(
  "/:counterparty_id",
  validatePriceUpdate,
  priceController.updatePrices,
);

// POST /api/prices/validate - валидировать структуру цен
router.post("/validate", priceController.validatePriceStructure);

module.exports = router;
