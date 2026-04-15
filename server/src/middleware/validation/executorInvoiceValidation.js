// middleware/validation/executorInvoiceValidation.js

const formatResponse = require("../../utils/formatResponse");

const validateRegisterInvoice = (req, res, next) => {
  const { order_id, invoice_number, invoice_date, amount, uploaded_by } =
    req.body;
  const errors = [];

  if (!order_id) {
    errors.push("Не указан ID заказа");
  }

  if (!invoice_number) {
    errors.push("Не указан номер счета");
  }

  if (!invoice_date) {
    errors.push("Не указана дата счета");
  } else {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(invoice_date)) {
      errors.push("Неверный формат даты. Используйте YYYY-MM-DD");
    }
  }

  if (!amount) {
    errors.push("Не указана сумма счета");
  } else if (isNaN(amount) || amount <= 0) {
    errors.push("Сумма счета должна быть положительным числом");
  }

  if (!uploaded_by) {
    errors.push("Не указан ID пользователя, загрузившего счет");
  }

  if (errors.length > 0) {
    return res
      .status(400)
      .json(formatResponse.error("Ошибка валидации", errors, 400));
  }

  next();
};

const validateConfirmPayment = (req, res, next) => {
  const { paid_by } = req.body;
  const errors = [];

  if (!paid_by) {
    errors.push("Не указан ID пользователя, подтвердившего оплату");
  }

  if (errors.length > 0) {
    return res
      .status(400)
      .json(formatResponse.error("Ошибка валидации", errors, 400));
  }

  next();
};

const validateVerifyInvoice = (req, res, next) => {
  const { verified_by } = req.body;
  const errors = [];

  if (!verified_by) {
    errors.push("Не указан ID пользователя, проверившего счет");
  }

  if (errors.length > 0) {
    return res
      .status(400)
      .json(formatResponse.error("Ошибка валидации", errors, 400));
  }

  next();
};

const validateRejectInvoice = (req, res, next) => {
  const { reason, rejected_by } = req.body;
  const errors = [];

  if (!reason) {
    errors.push("Не указана причина отклонения");
  }

  if (!rejected_by) {
    errors.push("Не указан ID пользователя, отклонившего счет");
  }

  if (errors.length > 0) {
    return res
      .status(400)
      .json(formatResponse.error("Ошибка валидации", errors, 400));
  }

  next();
};

module.exports = {
  validateRegisterInvoice,
  validateConfirmPayment,
  validateVerifyInvoice,
  validateRejectInvoice,
};
