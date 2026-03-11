/**
 * Форматирует дату в нужный формат
 * @param {Date} date - Объект даты
 * @returns {string} Отформатированная дата (например: "2026-03-06 20:16")
 */
function formatDate(date) {
  const isoString = date.toISOString(); // "2026-03-06T20:16:00.123Z"

  // Разбиваем по T и берем первую часть (дата) и первую часть времени
  const [datePart, timePart] = isoString.split("T");
  const [hours, minutes] = timePart.split(":");

  // Собираем в нужный формат: дата + пробел + часы:минуты
  return `${datePart} ${hours}:${minutes}`;
}

/**
 * Единый формат ответа от сервера
 * @param {number} statusCode - HTTP статус код
 * @param {string} message - Сообщение
 * @param {any} data - Данные (опционально)
 * @param {any} error - Ошибка (опционально)
 * @returns {Object} Форматированный ответ
 */
function formatResponse(statusCode, message, data = null, error = null) {
  return {
    success: statusCode >= 200 && statusCode < 300,
    statusCode,
    message,
    data,
    error,
    timestamp: formatDate(new Date()), // "2026-03-06 20:16"
  };
}

/**
 * Успешный ответ
 * @param {string} message - Сообщение
 * @param {any} data - Данные
 * @param {number} statusCode - HTTP статус (по умолчанию 200)
 * @returns {Object}
 */
formatResponse.success = (message, data = null, statusCode = 200) => {
  return formatResponse(statusCode, message, data, null);
};

/**
 * Ответ с ошибкой
 * @param {string} message - Сообщение об ошибке
 * @param {any} error - Детали ошибки
 * @param {number} statusCode - HTTP статус (по умолчанию 400)
 * @returns {Object}
 */
formatResponse.error = (message, error = null, statusCode = 400) => {
  return formatResponse(statusCode, message, null, error);
};

/**
 * Ответ 201 Created
 * @param {string} message - Сообщение
 * @param {any} data - Данные
 * @returns {Object}
 */
formatResponse.created = (message, data = null) => {
  return formatResponse(201, message, data, null);
};

/**
 * Ответ 404 Not Found
 * @param {string} message - Сообщение
 * @param {any} error - Детали ошибки
 * @returns {Object}
 */
formatResponse.notFound = (message = "Ресурс не найден", error = null) => {
  return formatResponse(404, message, null, error);
};

/**
 * Ответ 401 Unauthorized
 * @param {string} message - Сообщение
 * @param {any} error - Детали ошибки
 * @returns {Object}
 */
formatResponse.unauthorized = (message = "Не авторизован", error = null) => {
  return formatResponse(401, message, null, error);
};

/**
 * Ответ 403 Forbidden
 * @param {string} message - Сообщение
 * @param {any} error - Детали ошибки
 * @returns {Object}
 */
formatResponse.forbidden = (message = "Доступ запрещен", error = null) => {
  return formatResponse(403, message, null, error);
};

/**
 * Ответ 500 Internal Server Error
 * @param {string} message - Сообщение
 * @param {any} error - Детали ошибки
 * @returns {Object}
 */
formatResponse.serverError = (
  message = "Внутренняя ошибка сервера",
  error = null,
) => {
  return formatResponse(500, message, null, error);
};

module.exports = formatResponse;
