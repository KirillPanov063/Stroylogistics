/**
 * Форматирует номер телефона в единый формат +7XXXXXXXXXX
 * @param {string} phone - Номер телефона в любом формате
 * @returns {string|null} Отформатированный номер или null, если номер невалидный
 */
function formatPhone(phone) {
  if (!phone || typeof phone !== "string") return null;

  // Удаляем все нецифровые символы
  let cleaned = phone.replace(/\D/g, "");

  // Если начинается с 8, заменяем на 7
  if (cleaned.startsWith("8")) {
    cleaned = "7" + cleaned.slice(1);
  }

  // Если длина 10 цифр (без кода страны), добавляем 7
  if (cleaned.length === 10) {
    cleaned = "7" + cleaned;
  }

  // Проверяем, что получился валидный номер (11 цифр, начинается с 7)
  if (cleaned.length === 11 && cleaned.startsWith("7")) {
    return "+" + cleaned;
  }

  return null;
}

/**
 * Валидирует номер телефона
 * @param {string} phone - Номер телефона
 * @returns {boolean} true если номер валидный
 */
function validatePhone(phone) {
  return formatPhone(phone) !== null;
}

module.exports = formatPhone;
module.exports.validatePhone = validatePhone;
