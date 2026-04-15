// services/PriceService.js

const { Op } = require("sequelize");
const db = require("../db/models");

class PriceService {
  /**
   * Получить цену для клиента на основе его настроек
   * @param {string} counterpartyId - ID контрагента (клиента)
   * @param {string} containerVolume - объем контейнера (8m3, 20m3, 27m3)
   * @param {string} paymentType - тип оплаты (invoice_with_vat, invoice_without_vat, cash)
   * @returns {Promise<Object>} - Объект с ценой и использованным типом оплаты
   */
  static async getPriceForCustomer(
    counterpartyId,
    containerVolume,
    paymentType = null,
  ) {
    try {
      // Получаем контрагента с его настройками цен
      const counterparty = await db.Counterparty.findByPk(counterpartyId, {
        attributes: ["id", "default_prices", "price_history"],
      });

      if (!counterparty) {
        throw new Error(`Контрагент с ID ${counterpartyId} не найден`);
      }

      // Парсим default_prices (если строка, то парсим)
      let defaultPrices = counterparty.default_prices;
      if (typeof defaultPrices === "string") {
        defaultPrices = JSON.parse(defaultPrices);
      }

      // Если нет настроек цен, выбрасываем ошибку
      if (!defaultPrices || Object.keys(defaultPrices).length === 0) {
        throw new Error(`Для контрагента ${counterpartyId} не настроены цены`);
      }

      // Определяем тип оплаты для расчета цены
      let effectivePaymentType = paymentType;
      if (!effectivePaymentType) {
        // Используем default_payment_type из настроек
        effectivePaymentType = defaultPrices.default_payment_type;
      }

      // Проверяем, существует ли такой тип оплаты в настройках
      if (!defaultPrices[effectivePaymentType]) {
        throw new Error(
          `Тип оплаты ${effectivePaymentType} не настроен для контрагента`,
        );
      }

      // Получаем цену для указанного объема
      const price = defaultPrices[effectivePaymentType][containerVolume];

      if (!price) {
        throw new Error(
          `Цена для объема ${containerVolume} и типа оплаты ${effectivePaymentType} не найдена`,
        );
      }

      // Записываем в историю использования цен
      await this.recordPriceUsage(
        counterpartyId,
        containerVolume,
        effectivePaymentType,
        price,
      );

      return {
        price: parseFloat(price),
        used_payment_type: effectivePaymentType,
        container_volume: containerVolume,
        counterparty_id: counterpartyId,
      };
    } catch (error) {
      console.error("Ошибка получения цены для клиента:", error);
      throw error;
    }
  }

  /**
   * Обновить цены для контрагента
   * @param {string} counterpartyId - ID контрагента
   * @param {Object} newPrices - Новая структура цен
   * @param {string} changedBy - ID пользователя, который меняет цены
   * @returns {Promise<Object>} - Обновленный контрагент
   */
  static async updatePrices(counterpartyId, newPrices, changedBy) {
    try {
      const counterparty = await db.Counterparty.findByPk(counterpartyId);

      if (!counterparty) {
        throw new Error(`Контрагент с ID ${counterpartyId} не найден`);
      }

      // Сохраняем старые цены в историю
      const oldPrices = counterparty.default_prices;
      const priceHistoryEntry = {
        changed_at: new Date(),
        changed_by: changedBy,
        old_prices: oldPrices,
        new_prices: newPrices,
      };

      // Обновляем историю
      let priceHistory = counterparty.price_history || [];
      if (typeof priceHistory === "string") {
        priceHistory = JSON.parse(priceHistory);
      }

      priceHistory.push(priceHistoryEntry);

      // Обновляем контрагента
      await counterparty.update({
        default_prices: newPrices,
        price_history: priceHistory,
      });

      return counterparty;
    } catch (error) {
      console.error("Ошибка обновления цен:", error);
      throw error;
    }
  }

  /**
   * Записать использование цены в историю
   * @param {string} counterpartyId - ID контрагента
   * @param {string} containerVolume - Объем контейнера
   * @param {string} paymentType - Тип оплаты
   * @param {number} price - Цена
   */
  static async recordPriceUsage(
    counterpartyId,
    containerVolume,
    paymentType,
    price,
  ) {
    try {
      const counterparty = await db.Counterparty.findByPk(counterpartyId);

      if (!counterparty) return;

      let priceHistory = counterparty.price_history || [];
      if (typeof priceHistory === "string") {
        priceHistory = JSON.parse(priceHistory);
      }

      // Добавляем запись об использовании
      const usageEntry = {
        type: "usage",
        used_at: new Date(),
        container_volume: containerVolume,
        payment_type: paymentType,
        price: price,
      };

      priceHistory.push(usageEntry);

      // Обновляем историю (без изменения текущих цен)
      await counterparty.update({
        price_history: priceHistory,
      });
    } catch (error) {
      console.error("Ошибка записи использования цены:", error);
      // Не выбрасываем ошибку, чтобы не прерывать основной процесс
    }
  }

  /**
   * Рассчитать стоимость заказа
   * @param {string} counterpartyId - ID клиента
   * @param {string} containerVolume - Объем контейнера
   * @param {string} paymentType - Тип оплаты (опционально)
   * @returns {Promise<Object>} - Информация о стоимости
   */
  static async calculateOrderPrice(
    counterpartyId,
    containerVolume,
    paymentType = null,
  ) {
    try {
      const priceInfo = await this.getPriceForCustomer(
        counterpartyId,
        containerVolume,
        paymentType,
      );

      return {
        ...priceInfo,
        total_amount: priceInfo.price,
        calculated_at: new Date(),
      };
    } catch (error) {
      console.error("Ошибка расчета стоимости заказа:", error);
      throw error;
    }
  }

  /**
   * Получить все доступные цены для контрагента
   * @param {string} counterpartyId - ID контрагента
   * @returns {Promise<Object>} - Все цены контрагента
   */
  static async getAllPrices(counterpartyId) {
    try {
      const counterparty = await db.Counterparty.findByPk(counterpartyId, {
        attributes: ["id", "default_prices"],
      });

      if (!counterparty) {
        throw new Error(`Контрагент с ID ${counterpartyId} не найден`);
      }

      let defaultPrices = counterparty.default_prices;
      if (typeof defaultPrices === "string") {
        defaultPrices = JSON.parse(defaultPrices);
      }

      return defaultPrices;
    } catch (error) {
      console.error("Ошибка получения всех цен:", error);
      throw error;
    }
  }

  /**
   * Проверить валидность структуры цен
   * @param {Object} prices - Объект с ценами
   * @returns {Object} - Результат валидации
   */
  static validatePriceStructure(prices) {
    const errors = [];
    const requiredTypes = ["invoice_with_vat", "invoice_without_vat", "cash"];
    const requiredVolumes = ["8m3", "20m3", "27m3"];

    // Проверяем наличие всех типов оплаты
    for (const type of requiredTypes) {
      if (!prices[type]) {
        errors.push(`Отсутствует тип оплаты: ${type}`);
        continue;
      }

      // Проверяем наличие всех объемов для каждого типа
      for (const volume of requiredVolumes) {
        if (!prices[type][volume]) {
          errors.push(`Для типа ${type} отсутствует цена для объема ${volume}`);
        } else if (
          typeof prices[type][volume] !== "number" &&
          isNaN(parseFloat(prices[type][volume]))
        ) {
          errors.push(
            `Для типа ${type}, объема ${volume} указано некорректное значение цены`,
          );
        }
      }
    }

    // Проверяем default_payment_type
    if (!prices.default_payment_type) {
      errors.push("Отсутствует default_payment_type");
    } else if (!requiredTypes.includes(prices.default_payment_type)) {
      errors.push(
        `default_payment_type ${prices.default_payment_type} не соответствует допустимым типам`,
      );
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
    };
  }
}

module.exports = PriceService;
