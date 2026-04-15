const OrderService = require("../services/OrderService");
const CounterpartyService = require("../services/CounterpartyService");
const { Driver, Counterparty } = require("../db/models");
const formatResponse = require("../utils/formatResponse");

class OrderController {
  // * Получение всех заказов (с фильтрацией)
  static async getAll(req, res) {
    try {
      const filters = {
        status: req.query.status,
        customer_id: req.query.customerId,
        driver_id: req.query.driverId,
        executor_id: req.query.executorId,
        user_id: req.query.userId,
        payment_format: req.query.paymentFormat,
        payment_type: req.query.paymentType,
        date_from: req.query.dateFrom,
        date_to: req.query.dateTo,
      };

      const orders = await OrderService.getAll(filters);

      res.json(formatResponse.success("Заказы получены", orders));
    } catch (error) {
      console.error("Ошибка получения заказов:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить заказы",
            error.message,
          ),
        );
    }
  }

  // * Получение заказа по ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const order = await OrderService.getById(id);

      if (!order) {
        return res.status(404).json(formatResponse.notFound("Заказ не найден"));
      }

      res.json(formatResponse.success("Заказ получен", order));
    } catch (error) {
      console.error("Ошибка получения заказа:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить заказ",
            error.message,
          ),
        );
    }
  }

  // * Создание нового заказа
  static async create(req, res) {
    try {
      const userId = res.locals.user.id;
      const data = req.body;

      // ============= ПРОВЕРКА ОБЯЗАТЕЛЬНЫХ ПОЛЕЙ =============
      if (
        !data.customer_id ||
        !data.pickup_address ||
        !data.customer_phone ||
        !data.contact_phone ||
        !data.payment_type
      ) {
        return res
          .status(400)
          .json(formatResponse.error("Не все обязательные поля заполнены"));
      }

      // ============= ПРОВЕРКА: ВОДИТЕЛЬ ИЛИ ИСПОЛНИТЕЛЬ =============
      const hasDriver = data.driver_id !== undefined && data.driver_id !== null;
      const hasExecutor =
        data.executor_id !== undefined && data.executor_id !== null;

      if (!hasDriver && !hasExecutor) {
        return res
          .status(400)
          .json(
            formatResponse.error(
              "Должен быть указан либо водитель, либо исполнитель",
            ),
          );
      }

      if (hasDriver && hasExecutor) {
        return res
          .status(400)
          .json(
            formatResponse.error(
              "Нельзя указать одновременно и водителя, и исполнителя",
            ),
          );
      }

      // ============= ПРОВЕРКА КЛИЕНТА =============
      const customer = await CounterpartyService.getById(data.customer_id);
      if (!customer) {
        return res
          .status(404)
          .json(formatResponse.notFound("Клиент не найден"));
      }

      // ============= ПРОВЕРКА ВОДИТЕЛЯ =============
      if (hasDriver) {
        const driver = await Driver.findByPk(data.driver_id);
        if (!driver) {
          return res
            .status(404)
            .json(formatResponse.notFound("Водитель не найден"));
        }
      }

      // ============= ПРОВЕРКА ИСПОЛНИТЕЛЯ =============
      if (hasExecutor) {
        const executor = await Counterparty.findByPk(data.executor_id);
        if (!executor) {
          return res
            .status(404)
            .json(formatResponse.notFound("Исполнитель не найден"));
        }
        // Проверяем, что контрагент действительно может быть исполнителем
        if (!["executor", "both"].includes(executor.counterparty_type)) {
          return res
            .status(400)
            .json(
              formatResponse.error(
                "Указанный контрагент не может быть исполнителем",
              ),
            );
        }

        // Проверка комиссионных полей для исполнителя
        if (!data.client_amount || data.client_amount <= 0) {
          return res
            .status(400)
            .json(
              formatResponse.error(
                "Для исполнителя необходимо указать сумму от клиента",
              ),
            );
        }
        if (!data.executor_amount || data.executor_amount <= 0) {
          return res
            .status(400)
            .json(
              formatResponse.error(
                "Для исполнителя необходимо указать сумму исполнителю",
              ),
            );
        }
        if (
          data.commission_amount === undefined ||
          data.commission_amount === null
        ) {
          return res
            .status(400)
            .json(
              formatResponse.error(
                "Для исполнителя необходимо указать сумму комиссии",
              ),
            );
        }
      }

      // ============= СОЗДАНИЕ ЗАКАЗА =============
      const order = await OrderService.create(data, userId);

      res.status(201).json(formatResponse.created("Заказ создан", order));
    } catch (error) {
      console.error("Ошибка создания заказа:", error);

      let statusCode = 500;
      if (
        error.message.includes("обязателен") ||
        error.message.includes("Некорректный") ||
        error.message.includes("не найден")
      ) {
        statusCode = 400;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Обновление заказа
  static async update(req, res) {
    try {
      const { id } = req.params;
      const userId = res.locals.user.id;
      const data = req.body;

      // Проверяем существование заказа
      const existing = await OrderService.getById(id);
      if (!existing) {
        return res.status(404).json(formatResponse.notFound("Заказ не найден"));
      }

      // ============= ПРОВЕРКА СМЕНЫ ВОДИТЕЛЯ =============
      if (data.driver_id && data.driver_id !== existing.driver_id) {
        const driver = await Driver.findByPk(data.driver_id);
        if (!driver) {
          return res
            .status(404)
            .json(formatResponse.notFound("Водитель не найден"));
        }
      }

      // ============= ПРОВЕРКА СМЕНЫ ИСПОЛНИТЕЛЯ =============
      if (data.executor_id && data.executor_id !== existing.executor_id) {
        const executor = await Counterparty.findByPk(data.executor_id);
        if (!executor) {
          return res
            .status(404)
            .json(formatResponse.notFound("Исполнитель не найден"));
        }
        if (!["executor", "both"].includes(executor.counterparty_type)) {
          return res
            .status(400)
            .json(
              formatResponse.error(
                "Указанный контрагент не может быть исполнителем",
              ),
            );
        }
      }

      // ============= ПРОВЕРКА: НЕЛЬЗЯ ИМЕТЬ ОДНОВРЕМЕННО ВОДИТЕЛЯ И ИСПОЛНИТЕЛЯ =============
      const newHasDriver =
        data.driver_id !== undefined
          ? data.driver_id !== null
          : existing.driver_id !== null;
      const newHasExecutor =
        data.executor_id !== undefined
          ? data.executor_id !== null
          : existing.executor_id !== null;

      if (newHasDriver && newHasExecutor) {
        return res
          .status(400)
          .json(
            formatResponse.error(
              "Нельзя указать одновременно и водителя, и исполнителя",
            ),
          );
      }
      if (!newHasDriver && !newHasExecutor) {
        return res
          .status(400)
          .json(
            formatResponse.error(
              "Должен быть указан либо водитель, либо исполнитель",
            ),
          );
      }

      // ============= ОБНОВЛЕНИЕ ЗАКАЗА =============
      const updated = await OrderService.update(id, data, userId);

      res.json(formatResponse.success("Заказ обновлен", updated));
    } catch (error) {
      console.error("Ошибка обновления заказа:", error);

      let statusCode = 500;
      if (
        error.message.includes("Невозможно изменить статус") ||
        error.message.includes("некорректный") ||
        error.message.includes("должен быть указан")
      ) {
        statusCode = 400;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Обновление статуса заказа
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = res.locals.user.id;

      if (!status) {
        return res.status(400).json(formatResponse.error("Не указан статус"));
      }

      const order = await OrderService.updateStatus(id, status, userId);

      res.json(formatResponse.success("Статус заказа обновлен", order));
    } catch (error) {
      console.error("Ошибка обновления статуса:", error);

      let statusCode = 500;
      if (error.message.includes("Невозможно изменить статус")) {
        statusCode = 400;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Назначение водителя
  static async assignDriver(req, res) {
    try {
      const { id } = req.params;
      const { driverId } = req.body;
      const userId = res.locals.user.id;

      if (!driverId) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан ID водителя"));
      }

      const driver = await Driver.findByPk(driverId);
      if (!driver) {
        return res
          .status(404)
          .json(formatResponse.notFound("Водитель не найден"));
      }

      const order = await OrderService.assignDriver(id, driverId, userId);

      res.json(formatResponse.success("Водитель назначен", order));
    } catch (error) {
      console.error("Ошибка назначения водителя:", error);

      let statusCode = 500;
      if (error.message.includes("не найден")) {
        statusCode = 404;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Назначение исполнителя
  static async assignExecutor(req, res) {
    try {
      const { id } = req.params;
      const { executorId, clientAmount, executorAmount, commissionAmount } =
        req.body;
      const userId = res.locals.user.id;

      if (!executorId) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан ID исполнителя"));
      }

      if (!clientAmount || clientAmount <= 0) {
        return res
          .status(400)
          .json(formatResponse.error("Необходимо указать сумму от клиента"));
      }
      if (!executorAmount || executorAmount <= 0) {
        return res
          .status(400)
          .json(formatResponse.error("Необходимо указать сумму исполнителю"));
      }
      if (commissionAmount === undefined || commissionAmount === null) {
        return res
          .status(400)
          .json(formatResponse.error("Необходимо указать сумму комиссии"));
      }

      const executor = await Counterparty.findByPk(executorId);
      if (!executor) {
        return res
          .status(404)
          .json(formatResponse.notFound("Исполнитель не найден"));
      }
      if (!["executor", "both"].includes(executor.counterparty_type)) {
        return res
          .status(400)
          .json(
            formatResponse.error(
              "Указанный контрагент не может быть исполнителем",
            ),
          );
      }

      const order = await OrderService.assignExecutor(
        id,
        executorId,
        clientAmount,
        executorAmount,
        commissionAmount,
        userId,
      );

      res.json(formatResponse.success("Исполнитель назначен", order));
    } catch (error) {
      console.error("Ошибка назначения исполнителя:", error);

      let statusCode = 500;
      if (error.message.includes("не найден")) {
        statusCode = 404;
      } else if (error.message.includes("необходимо указать")) {
        statusCode = 400;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Получение заказов по исполнителю
  static async getByExecutor(req, res) {
    try {
      const { executorId } = req.params;
      const includeCompleted = req.query.includeCompleted === "true";

      const executor = await Counterparty.findByPk(executorId);
      if (!executor) {
        return res
          .status(404)
          .json(formatResponse.notFound("Исполнитель не найден"));
      }

      const orders = await OrderService.getByExecutor(
        executorId,
        includeCompleted,
      );

      res.json(formatResponse.success("Заказы исполнителя получены", orders));
    } catch (error) {
      console.error("Ошибка получения заказов исполнителя:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить заказы",
            error.message,
          ),
        );
    }
  }

  // * Добавление фото выполнения
  static async addCompletionPhoto(req, res) {
    try {
      const { id } = req.params;
      const { photoPath } = req.body;
      const userId = res.locals.user.id;

      if (!photoPath) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан путь к фото"));
      }

      const order = await OrderService.addCompletionPhoto(
        id,
        photoPath,
        userId,
      );

      res.json(formatResponse.success("Фото выполнения добавлено", order));
    } catch (error) {
      console.error("Ошибка добавления фото:", error);

      let statusCode = 500;
      if (error.message.includes("не найден")) {
        statusCode = 404;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Добавление подтверждения оплаты
  static async addPaymentConfirmation(req, res) {
    try {
      const { id } = req.params;
      const { filePath } = req.body;
      const userId = res.locals.user.id;

      if (!filePath) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан путь к файлу"));
      }

      const order = await OrderService.addPaymentConfirmation(
        id,
        filePath,
        userId,
      );

      res.json(formatResponse.success("Подтверждение оплаты добавлено", order));
    } catch (error) {
      console.error("Ошибка добавления подтверждения:", error);

      let statusCode = 500;
      if (error.message.includes("не найден")) {
        statusCode = 404;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Использование предоплаченной доставки
  static async usePrepaidDelivery(req, res) {
    try {
      const { id } = req.params;

      const order = await OrderService.usePrepaidDelivery(id);

      res.json(
        formatResponse.success("Предоплаченная доставка использована", order),
      );
    } catch (error) {
      console.error("Ошибка использования предоплаты:", error);

      let statusCode = 500;
      if (error.message.includes("не найден")) {
        statusCode = 404;
      } else if (error.message.includes("не предоплаченный")) {
        statusCode = 400;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Получение заказов по клиенту
  static async getByCustomer(req, res) {
    try {
      const { customerId } = req.params;
      const includeCompleted = req.query.includeCompleted === "true";

      const customer = await CounterpartyService.getById(customerId);
      if (!customer) {
        return res
          .status(404)
          .json(formatResponse.notFound("Клиент не найден"));
      }

      const orders = await OrderService.getByCustomer(
        customerId,
        includeCompleted,
      );

      res.json(formatResponse.success("Заказы клиента получены", orders));
    } catch (error) {
      console.error("Ошибка получения заказов клиента:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить заказы",
            error.message,
          ),
        );
    }
  }

  // * Получение заказов по водителю
  static async getByDriver(req, res) {
    try {
      const { driverId } = req.params;
      const includeCompleted = req.query.includeCompleted === "true";

      const driver = await Driver.findByPk(driverId);
      if (!driver) {
        return res
          .status(404)
          .json(formatResponse.notFound("Водитель не найден"));
      }

      const orders = await OrderService.getByDriver(driverId, includeCompleted);

      res.json(formatResponse.success("Заказы водителя получены", orders));
    } catch (error) {
      console.error("Ошибка получения заказов водителя:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить заказы",
            error.message,
          ),
        );
    }
  }

  // * Поиск заказов по номеру
  static async searchByNumber(req, res) {
    try {
      const { orderNumber } = req.params;

      const orders = await OrderService.searchByNumber(orderNumber);

      res.json(formatResponse.success("Результаты поиска", orders));
    } catch (error) {
      console.error("Ошибка поиска по номеру:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось выполнить поиск",
            error.message,
          ),
        );
    }
  }

  // * Поиск заказов по адресу
  static async searchByAddress(req, res) {
    try {
      const { address } = req.params;

      const orders = await OrderService.searchByAddress(address);

      res.json(formatResponse.success("Результаты поиска", orders));
    } catch (error) {
      console.error("Ошибка поиска по адресу:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось выполнить поиск",
            error.message,
          ),
        );
    }
  }

  // * Получение заказов для напоминаний
  static async getOrdersForReminders(req, res) {
    try {
      const orders = await OrderService.getOrdersForReminders();

      res.json(formatResponse.success("Заказы для напоминаний", orders));
    } catch (error) {
      console.error("Ошибка получения заказов для напоминаций:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить заказы",
            error.message,
          ),
        );
    }
  }

  // * Статистика по заказам
  static async getStats(req, res) {
    try {
      const filters = {
        date_from: req.query.dateFrom,
        date_to: req.query.dateTo,
      };

      const stats = await OrderService.getStats(filters);

      res.json(formatResponse.success("Статистика по заказам", stats));
    } catch (error) {
      console.error("Ошибка получения статистики:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить статистику",
            error.message,
          ),
        );
    }
  }

  // * Получение цепочки связанных заказов
  static async getOrderChain(req, res) {
    try {
      const { id } = req.params;

      const chain = await OrderService.getOrderChain(id);

      res.json(formatResponse.success("Цепочка заказов", chain));
    } catch (error) {
      console.error("Ошибка получения цепочки заказов:", error);

      let statusCode = 500;
      if (error.message.includes("не найден")) {
        statusCode = 404;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Отметка об уведомлении о последней доставке
  static async markLastDeliveryNotified(req, res) {
    try {
      const { id } = req.params;

      const order = await OrderService.markLastDeliveryNotified(id);

      res.json(formatResponse.success("Уведомление отмечено", order));
    } catch (error) {
      console.error("Ошибка отметки уведомления:", error);

      let statusCode = 500;
      if (error.message.includes("не найден")) {
        statusCode = 404;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Удаление заказа (только для админов)
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const existing = await OrderService.getById(id);
      if (!existing) {
        return res.status(404).json(formatResponse.notFound("Заказ не найден"));
      }

      await OrderService.delete(id);

      res.json(formatResponse.success("Заказ удален", { id }));
    } catch (error) {
      console.error("Ошибка удаления заказа:", error);

      let statusCode = 500;
      if (error.message.includes("не найден")) {
        statusCode = 404;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }
}

module.exports = OrderController;
