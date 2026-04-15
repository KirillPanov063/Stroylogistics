const RelationshipService = require("../services/RelationshipService");
const CounterpartyService = require("../services/CounterpartyService");
const formatResponse = require("../utils/formatResponse");

class RelationshipController {
  // * Получение всех связей (с фильтрацией)
  static async getAll(req, res) {
    try {
      const filters = {
        client_id: req.query.clientId,
        executor_id: req.query.executorId,
        relationship_type: req.query.type,
        is_active:
          req.query.isActive === "true"
            ? true
            : req.query.isActive === "false"
              ? false
              : undefined,
        search: req.query.search,
      };

      const relationships = await RelationshipService.getAll(filters);

      res.json(formatResponse.success("Связи получены", relationships));
    } catch (error) {
      console.error("Ошибка получения связей:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить связи",
            error.message,
          ),
        );
    }
  }

  // * Получение связи по ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const relationship = await RelationshipService.getById(id);

      if (!relationship) {
        return res
          .status(404)
          .json(formatResponse.notFound("Связь не найдена"));
      }

      res.json(formatResponse.success("Связь получена", relationship));
    } catch (error) {
      console.error("Ошибка получения связи:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить связь",
            error.message,
          ),
        );
    }
  }

  // * Получение всех связей клиента
  static async getByClientId(req, res) {
    try {
      const { clientId } = req.params;
      const includeInactive = req.query.includeInactive === "true";

      // Проверяем, что клиент существует
      const client = await CounterpartyService.getById(clientId);
      if (!client) {
        return res
          .status(404)
          .json(formatResponse.notFound("Клиент не найден"));
      }

      const relationships = await RelationshipService.getByClientId(
        clientId,
        includeInactive,
      );

      res.json(formatResponse.success("Связи клиента получены", relationships));
    } catch (error) {
      console.error("Ошибка получения связей клиента:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить связи",
            error.message,
          ),
        );
    }
  }

  // * Получение всех связей исполнителя
  static async getByExecutorId(req, res) {
    try {
      const { executorId } = req.params;
      const includeInactive = req.query.includeInactive === "true";

      // Проверяем, что исполнитель существует
      const executor = await CounterpartyService.getById(executorId);
      if (!executor) {
        return res
          .status(404)
          .json(formatResponse.notFound("Исполнитель не найден"));
      }

      const relationships = await RelationshipService.getByExecutorId(
        executorId,
        includeInactive,
      );

      res.json(
        formatResponse.success("Связи исполнителя получены", relationships),
      );
    } catch (error) {
      console.error("Ошибка получения связей исполнителя:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить связи",
            error.message,
          ),
        );
    }
  }

  // * Создание новой связи
  static async create(req, res) {
    try {
      const {
        client_id,
        executor_id,
        relationship_type,
        contract_number,
        contract_date,
        notes,
      } = req.body;

      // Проверка обязательных полей
      if (!client_id || !executor_id || !relationship_type) {
        return res
          .status(400)
          .json(formatResponse.error("Не все обязательные поля заполнены"));
      }

      // Проверяем, что клиент существует
      const client = await CounterpartyService.getById(client_id);
      if (!client) {
        return res
          .status(404)
          .json(formatResponse.notFound("Клиент не найден"));
      }

      // Проверяем, что исполнитель существует
      const executor = await CounterpartyService.getById(executor_id);
      if (!executor) {
        return res
          .status(404)
          .json(formatResponse.notFound("Исполнитель не найден"));
      }

      const relationship = await RelationshipService.create({
        client_id,
        executor_id,
        relationship_type,
        contract_number,
        contract_date,
        notes,
      });

      res
        .status(201)
        .json(formatResponse.created("Связь создана", relationship));
    } catch (error) {
      console.error("Ошибка создания связи:", error);

      let statusCode = 500;
      if (
        error.message.includes("уже существует") ||
        error.message.includes("не может быть")
      ) {
        statusCode = 400;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Обновление связи
  static async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      // Проверяем существование связи
      const existing = await RelationshipService.getById(id);
      if (!existing) {
        return res
          .status(404)
          .json(formatResponse.notFound("Связь не найдена"));
      }

      // Нельзя изменить клиента или исполнителя
      if (data.client_id || data.executor_id) {
        return res
          .status(400)
          .json(
            formatResponse.error(
              "Нельзя изменить участников связи. Создайте новую связь.",
            ),
          );
      }

      const updated = await RelationshipService.update(id, data);

      res.json(formatResponse.success("Связь обновлена", updated));
    } catch (error) {
      console.error("Ошибка обновления связи:", error);

      let statusCode = 500;
      if (error.message.includes("Некорректный")) {
        statusCode = 400;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Деактивация связи (мягкое удаление)
  static async deactivate(req, res) {
    try {
      const { id } = req.params;

      const result = await RelationshipService.deactivate(id);

      res.json(formatResponse.success("Связь деактивирована", result));
    } catch (error) {
      console.error("Ошибка деактивации связи:", error);

      if (error.message.includes("не найдена")) {
        return res.status(404).json(formatResponse.notFound(error.message));
      }

      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось деактивировать связь",
            error.message,
          ),
        );
    }
  }

  // * Активация связи
  static async activate(req, res) {
    try {
      const { id } = req.params;

      const result = await RelationshipService.activate(id);

      res.json(formatResponse.success("Связь активирована", result));
    } catch (error) {
      console.error("Ошибка активации связи:", error);

      if (error.message.includes("не найдена")) {
        return res.status(404).json(formatResponse.notFound(error.message));
      }

      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось активировать связь",
            error.message,
          ),
        );
    }
  }

  // * Полное удаление связи
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const result = await RelationshipService.delete(id);

      res.json(formatResponse.success("Связь удалена", { id: result }));
    } catch (error) {
      console.error("Ошибка удаления связи:", error);

      if (error.message.includes("не найдена")) {
        return res.status(404).json(formatResponse.notFound(error.message));
      }

      res
        .status(500)
        .json(
          formatResponse.serverError("Не удалось удалить связь", error.message),
        );
    }
  }

  // * Поиск по номеру договора
  static async searchByContractNumber(req, res) {
    try {
      const { contractNumber } = req.params;

      const relationships =
        await RelationshipService.searchByContractNumber(contractNumber);

      res.json(formatResponse.success("Результаты поиска", relationships));
    } catch (error) {
      console.error("Ошибка поиска по договору:", error);
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

  // * Поиск по дате договора
  static async searchByContractDate(req, res) {
    try {
      const { date } = req.params;

      const relationships =
        await RelationshipService.searchByContractDate(date);

      res.json(formatResponse.success("Результаты поиска", relationships));
    } catch (error) {
      console.error("Ошибка поиска по дате:", error);
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

  // * Получение связей по типу
  static async getByType(req, res) {
    try {
      const { type } = req.params;
      const includeInactive = req.query.includeInactive === "true";

      const relationships = await RelationshipService.getByType(
        type,
        includeInactive,
      );

      res.json(formatResponse.success("Связи получены", relationships));
    } catch (error) {
      console.error("Ошибка получения связей по типу:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить связи",
            error.message,
          ),
        );
    }
  }

  // * Статистика по связям клиента
  static async getClientStats(req, res) {
    try {
      const { clientId } = req.params;

      // Проверяем, что клиент существует
      const client = await CounterpartyService.getById(clientId);
      if (!client) {
        return res
          .status(404)
          .json(formatResponse.notFound("Клиент не найден"));
      }

      const stats = await RelationshipService.getClientStats(clientId);

      res.json(formatResponse.success("Статистика по связям клиента", stats));
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

  // * Статистика по связям исполнителя
  static async getExecutorStats(req, res) {
    try {
      const { executorId } = req.params;

      // Проверяем, что исполнитель существует
      const executor = await CounterpartyService.getById(executorId);
      if (!executor) {
        return res
          .status(404)
          .json(formatResponse.notFound("Исполнитель не найден"));
      }

      const stats = await RelationshipService.getExecutorStats(executorId);

      res.json(
        formatResponse.success("Статистика по связям исполнителя", stats),
      );
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

  // * Глобальная статистика
  static async getGlobalStats(req, res) {
    try {
      const stats = await RelationshipService.getGlobalStats();

      res.json(formatResponse.success("Глобальная статистика", stats));
    } catch (error) {
      console.error("Ошибка получения глобальной статистики:", error);
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

  // * Проверка наличия активной связи
  static async hasActiveRelationship(req, res) {
    try {
      const { clientId, executorId } = req.params;

      const hasActive = await RelationshipService.hasActiveRelationship(
        clientId,
        executorId,
      );

      res.json(formatResponse.success("Проверка выполнена", { hasActive }));
    } catch (error) {
      console.error("Ошибка проверки связи:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось выполнить проверку",
            error.message,
          ),
        );
    }
  }

  // * Получение всех исполнителей клиента
  static async getClientExecutors(req, res) {
    try {
      const { clientId } = req.params;
      const includeInactive = req.query.includeInactive === "true";

      const executors = await RelationshipService.getClientExecutors(
        clientId,
        includeInactive,
      );

      res.json(
        formatResponse.success("Исполнители клиента получены", executors),
      );
    } catch (error) {
      console.error("Ошибка получения исполнителей:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить исполнителей",
            error.message,
          ),
        );
    }
  }

  // * Получение всех клиентов исполнителя
  static async getExecutorClients(req, res) {
    try {
      const { executorId } = req.params;
      const includeInactive = req.query.includeInactive === "true";

      const clients = await RelationshipService.getExecutorClients(
        executorId,
        includeInactive,
      );

      res.json(formatResponse.success("Клиенты исполнителя получены", clients));
    } catch (error) {
      console.error("Ошибка получения клиентов:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить клиентов",
            error.message,
          ),
        );
    }
  }

  // * Получение связей с истекающими договорами
  static async getExpiringContracts(req, res) {
    try {
      const daysThreshold = req.query.days ? parseInt(req.query.days) : 30;

      const relationships =
        await RelationshipService.getExpiringContracts(daysThreshold);

      res.json(formatResponse.success("Истекающие договоры", relationships));
    } catch (error) {
      console.error("Ошибка получения истекающих договоров:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить договоры",
            error.message,
          ),
        );
    }
  }

  // * Получение связей без договора
  static async getWithoutContract(req, res) {
    try {
      const relationships = await RelationshipService.getWithoutContract();

      res.json(formatResponse.success("Связи без договора", relationships));
    } catch (error) {
      console.error("Ошибка получения связей без договора:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить связи",
            error.message,
          ),
        );
    }
  }
}

module.exports = RelationshipController;
