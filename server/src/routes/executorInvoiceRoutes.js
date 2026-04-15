// routes/executorInvoiceRoutes.js

const express = require("express");
const router = express.Router();
const executorInvoiceController = require("../controllers/executorInvoiceController");
const {
  validateRegisterInvoice,
  validateConfirmPayment,
  validateVerifyInvoice,
  validateRejectInvoice,
} = require("../middleware/validation/executorInvoiceValidation");

// Проверяем, что все методы существуют
console.log("🔍 Проверка методов ExecutorInvoiceController:");
console.log(
  "  - getAllInvoices:",
  typeof executorInvoiceController.getAllInvoices,
);
console.log(
  "  - getOverdueInvoices:",
  typeof executorInvoiceController.getOverdueInvoices,
);
console.log(
  "  - getInvoiceInfo:",
  typeof executorInvoiceController.getInvoiceInfo,
);
console.log(
  "  - registerInvoice:",
  typeof executorInvoiceController.registerInvoice,
);
console.log(
  "  - verifyInvoice:",
  typeof executorInvoiceController.verifyInvoice,
);
console.log(
  "  - confirmPayment:",
  typeof executorInvoiceController.confirmPayment,
);
console.log(
  "  - rejectInvoice:",
  typeof executorInvoiceController.rejectInvoice,
);

// GET /api/executor-invoices - получить все счета (с фильтрацией)
if (executorInvoiceController.getAllInvoices) {
  router.get(
    "/",
    executorInvoiceController.getAllInvoices.bind(executorInvoiceController),
  );
}

// GET /api/executor-invoices/overdue - получить просроченные счета
if (executorInvoiceController.getOverdueInvoices) {
  router.get(
    "/overdue",
    executorInvoiceController.getOverdueInvoices.bind(
      executorInvoiceController,
    ),
  );
}

// GET /api/executor-invoices/:order_id - получить информацию о счете по заказу
if (executorInvoiceController.getInvoiceInfo) {
  router.get(
    "/:order_id",
    executorInvoiceController.getInvoiceInfo.bind(executorInvoiceController),
  );
}

// POST /api/executor-invoices/register - зарегистрировать счет от исполнителя
if (executorInvoiceController.registerInvoice) {
  router.post(
    "/register",
    validateRegisterInvoice,
    executorInvoiceController.registerInvoice.bind(executorInvoiceController),
  );
}

// PUT /api/executor-invoices/:order_id/verify - проверить счет
if (executorInvoiceController.verifyInvoice) {
  router.put(
    "/:order_id/verify",
    validateVerifyInvoice,
    executorInvoiceController.verifyInvoice.bind(executorInvoiceController),
  );
}

// PUT /api/executor-invoices/:order_id/confirm-payment - подтвердить оплату исполнителю
if (executorInvoiceController.confirmPayment) {
  router.put(
    "/:order_id/confirm-payment",
    validateConfirmPayment,
    executorInvoiceController.confirmPayment.bind(executorInvoiceController),
  );
}

// PUT /api/executor-invoices/:order_id/reject - отклонить счет
if (executorInvoiceController.rejectInvoice) {
  router.put(
    "/:order_id/reject",
    validateRejectInvoice,
    executorInvoiceController.rejectInvoice.bind(executorInvoiceController),
  );
}

module.exports = router;
