// middleware/validation/priceValidation.js

const formatResponse = require("../../utils/formatResponse");

const validatePriceCalculation = (req, res, next) => {
  const { counterparty_id, container_volume } = req.query;
  const errors = [];

  if (!counterparty_id) {
    errors.push("Не указан ID контрагента");
  }

  if (!container_volume) {
    errors.push("Не указан объем контейнера");
  } else {
    const validVolumes = ["8m3", "20m3", "27m3"];
    if (!validVolumes.includes(container_volume)) {
      errors.push(
        `Недопустимый объем контейнера. Допустимые значения: ${validVolumes.join(", ")}`,
      );
    }
  }

  if (errors.length > 0) {
    return res
      .status(400)
      .json(formatResponse.error("Ошибка валидации", errors, 400));
  }

  next();
};

const validatePriceUpdate = (req, res, next) => {
  const { prices, changed_by } = req.body;
  const errors = [];

  if (!prices) {
    errors.push("Не указаны новые цены");
  }

  if (!changed_by) {
    errors.push("Не указан ID пользователя, изменяющего цены");
  }

  if (errors.length > 0) {
    return res
      .status(400)
      .json(formatResponse.error("Ошибка валидации", errors, 400));
  }

  next();
};

module.exports = {
  validatePriceCalculation,
  validatePriceUpdate,
};
