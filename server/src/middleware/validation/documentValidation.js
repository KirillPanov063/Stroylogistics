// middleware/validation/documentValidation.js

const formatResponse = require("../../utils/formatResponse");

const validDocumentTypes = [
  "executor_invoice",
  "executor_payment_confirmation",
  "client_invoice",
  "client_payment_confirmation",
  "contract",
  "act",
  "permit",
  "other",
];

const validateUploadDocument = (req, res, next) => {
  const { document_type, order_id, counterparty_id, object_id } = req.body;
  const errors = [];

  if (!document_type) {
    errors.push("Тип документа обязателен");
  } else if (!validDocumentTypes.includes(document_type)) {
    errors.push(
      `Недопустимый тип документа. Допустимые типы: ${validDocumentTypes.join(", ")}`,
    );
  }

  // Проверяем, что связан хотя бы один объект
  if (!order_id && !counterparty_id && !object_id) {
    errors.push(
      "Документ должен быть связан с заказом, контрагентом или объектом",
    );
  }

  if (!req.file) {
    errors.push("Файл не загружен");
  }

  if (errors.length > 0) {
    return res
      .status(400)
      .json(formatResponse.error("Ошибка валидации", errors, 400));
  }

  next();
};

const validateDocumentId = (req, res, next) => {
  const { document_id } = req.params;
  const errors = [];

  if (!document_id) {
    errors.push("Не указан ID документа");
  }

  if (errors.length > 0) {
    return res
      .status(400)
      .json(formatResponse.error("Ошибка валидации", errors, 400));
  }

  next();
};

const validateUpdateDocument = (req, res, next) => {
  const { document_number, document_date, amount } = req.body;
  const errors = [];

  if (document_date) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(document_date)) {
      errors.push("Неверный формат даты. Используйте YYYY-MM-DD");
    }
  }

  if (amount && (isNaN(amount) || amount <= 0)) {
    errors.push("Сумма должна быть положительным числом");
  }

  if (errors.length > 0) {
    return res
      .status(400)
      .json(formatResponse.error("Ошибка валидации", errors, 400));
  }

  next();
};

module.exports = {
  validateUploadDocument,
  validateDocumentId,
  validateUpdateDocument,
  validDocumentTypes,
};
