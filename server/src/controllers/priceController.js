// controllers/priceController.js

const db = require("../db/models"); // 🔧 ДОБАВЛЕНО
const PriceService = require("../services/PriceService");
const formatResponse = require("../utils/formatResponse");

class PriceController {
  /**
   * Получить цену для клиента
   * GET /api/prices/calculate
   * Query: counterparty_id, container_volume, payment_type (опционально)
   */
  async calculatePrice(req, res) {
    try {
      const { counterparty_id, container_volume, payment_type } = req.query;

      // Валидация обязательных полей
      if (!counterparty_id) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан ID контрагента", null, 400));
      }

      if (!container_volume) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан объем контейнера", null, 400));
      }

      // Валидация объема контейнера
      const validVolumes = ["8m3", "20m3", "27m3"];
      if (!validVolumes.includes(container_volume)) {
        return res.status(400).json(
          formatResponse.error(
            "Недопустимый объем контейнера",
            {
              allowed: validVolumes,
              received: container_volume,
            },
            400,
          ),
        );
      }

      const priceInfo = await PriceService.calculateOrderPrice(
        counterparty_id,
        container_volume,
        payment_type || null,
      );

      return res
        .status(200)
        .json(
          formatResponse.success("Цена рассчитана успешно", priceInfo, 200),
        );
    } catch (error) {
      console.error("Ошибка расчета цены:", error);

      if (error.message.includes("не найден")) {
        return res
          .status(404)
          .json(formatResponse.notFound(error.message, error.message));
      }

      if (
        error.message.includes("не настроены цены") ||
        error.message.includes("не найдена")
      ) {
        return res
          .status(400)
          .json(formatResponse.error(error.message, error.message, 400));
      }

      return res
        .status(500)
        .json(
          formatResponse.serverError("Ошибка при расчете цены", error.message),
        );
    }
  }

  /**
   * Получить все цены контрагента
   * GET /api/prices/:counterparty_id
   */
  async getPrices(req, res) {
    try {
      const { counterparty_id } = req.params;

      if (!counterparty_id) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан ID контрагента", null, 400));
      }

      const prices = await PriceService.getAllPrices(counterparty_id);

      return res
        .status(200)
        .json(formatResponse.success("Цены получены успешно", prices, 200));
    } catch (error) {
      console.error("Ошибка получения цен:", error);

      if (error.message.includes("не найден")) {
        return res
          .status(404)
          .json(formatResponse.notFound(error.message, error.message));
      }

      return res
        .status(500)
        .json(
          formatResponse.serverError("Ошибка при получении цен", error.message),
        );
    }
  }

  /**
   * Обновить цены контрагента
   * PUT /api/prices/:counterparty_id
   * Body: { prices: {...}, changed_by: "user_id" }
   */
  async updatePrices(req, res) {
    try {
      const { counterparty_id } = req.params;
      const { prices, changed_by } = req.body;

      if (!counterparty_id) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан ID контрагента", null, 400));
      }

      if (!prices) {
        return res
          .status(400)
          .json(formatResponse.error("Не указаны новые цены", null, 400));
      }

      if (!changed_by) {
        return res
          .status(400)
          .json(
            formatResponse.error(
              "Не указан ID пользователя, изменяющего цены",
              null,
              400,
            ),
          );
      }

      // Валидация структуры цен
      const validation = PriceService.validatePriceStructure(prices);
      if (!validation.isValid) {
        return res
          .status(400)
          .json(
            formatResponse.error(
              "Неверная структура цен",
              validation.errors,
              400,
            ),
          );
      }

      const updatedCounterparty = await PriceService.updatePrices(
        counterparty_id,
        prices,
        changed_by,
      );

      return res.status(200).json(
        formatResponse.success(
          "Цены успешно обновлены",
          {
            id: updatedCounterparty.id,
            default_prices: updatedCounterparty.default_prices,
            price_history_updated: true,
          },
          200,
        ),
      );
    } catch (error) {
      console.error("Ошибка обновления цен:", error);

      if (error.message.includes("не найден")) {
        return res
          .status(404)
          .json(formatResponse.notFound(error.message, error.message));
      }

      return res
        .status(500)
        .json(
          formatResponse.serverError(
            "Ошибка при обновлении цен",
            error.message,
          ),
        );
    }
  }

  /**
   * Валидировать структуру цен (без сохранения)
   * POST /api/prices/validate
   * Body: { prices: {...} }
   */
  async validatePriceStructure(req, res) {
    try {
      const { prices } = req.body;

      if (!prices) {
        return res
          .status(400)
          .json(
            formatResponse.error(
              "Не указана структура цен для валидации",
              null,
              400,
            ),
          );
      }

      const validation = PriceService.validatePriceStructure(prices);

      if (validation.isValid) {
        return res
          .status(200)
          .json(
            formatResponse.success("Структура цен валидна", validation, 200),
          );
      } else {
        return res
          .status(400)
          .json(
            formatResponse.error(
              "Структура цен невалидна",
              validation.errors,
              400,
            ),
          );
      }
    } catch (error) {
      console.error("Ошибка валидации цен:", error);
      return res
        .status(500)
        .json(
          formatResponse.serverError("Ошибка при валидации цен", error.message),
        );
    }
  }

  /**
   * Получить историю цен контрагента
   * GET /api/prices/:counterparty_id/history
   */
  async getPriceHistory(req, res) {
    try {
      const { counterparty_id } = req.params;

      if (!counterparty_id) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан ID контрагента", null, 400));
      }

      const counterparty = await db.Counterparty.findByPk(counterparty_id, {
        attributes: ["id", "price_history"],
      });

      if (!counterparty) {
        return res
          .status(404)
          .json(
            formatResponse.notFound(
              `Контрагент с ID ${counterparty_id} не найден`,
            ),
          );
      }

      let priceHistory = counterparty.price_history || [];
      if (typeof priceHistory === "string") {
        priceHistory = JSON.parse(priceHistory);
      }

      return res
        .status(200)
        .json(
          formatResponse.success("История цен получена", priceHistory, 200),
        );
    } catch (error) {
      console.error("Ошибка получения истории цен:", error);
      return res
        .status(500)
        .json(
          formatResponse.serverError(
            "Ошибка при получении истории цен",
            error.message,
          ),
        );
    }
  }
}

module.exports = new PriceController();
