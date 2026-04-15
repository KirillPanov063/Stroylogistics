const ObjectService = require("../services/ObjectService");
const CounterpartyService = require("../services/CounterpartyService");
const formatResponse = require("../utils/formatResponse");

class ObjectController {
  // * Получение всех объектов (с фильтрацией)
  static async getAll(req, res) {
    try {
      const filters = {
        counterparty_id: req.query.counterpartyId,
        is_active:
          req.query.isActive === "true"
            ? true
            : req.query.isActive === "false"
              ? false
              : undefined,
        search: req.query.search,
      };

      const objects = await ObjectService.getAll(filters);

      res.json(formatResponse.success("Объекты получены", objects));
    } catch (error) {
      console.error("Ошибка получения объектов:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить объекты",
            error.message,
          ),
        );
    }
  }

  // * Получение объекта по ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const object = await ObjectService.getById(id);

      if (!object) {
        return res
          .status(404)
          .json(formatResponse.notFound("Объект не найден"));
      }

      res.json(formatResponse.success("Объект получен", object));
    } catch (error) {
      console.error("Ошибка получения объекта:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить объект",
            error.message,
          ),
        );
    }
  }

  // * Получение всех объектов контрагента
  static async getByCounterpartyId(req, res) {
    try {
      const { counterpartyId } = req.params;
      const includeInactive = req.query.includeInactive === "true";

      // Проверяем, что контрагент существует
      const counterparty = await CounterpartyService.getById(counterpartyId);
      if (!counterparty) {
        return res
          .status(404)
          .json(formatResponse.notFound("Контрагент не найден"));
      }

      const objects = await ObjectService.getByCounterpartyId(
        counterpartyId,
        includeInactive,
      );

      res.json(formatResponse.success("Объекты контрагента получены", objects));
    } catch (error) {
      console.error("Ошибка получения объектов контрагента:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить объекты",
            error.message,
          ),
        );
    }
  }

  // * Создание нового объекта
  static async create(req, res) {
    try {
      const { counterpartyId } = req.params;
      const data = req.body;

      // Проверяем, что контрагент существует
      const counterparty = await CounterpartyService.getById(counterpartyId);
      if (!counterparty) {
        return res
          .status(404)
          .json(formatResponse.notFound("Контрагент не найден"));
      }

      // Проверка обязательных полей
      if (
        !data.address ||
        !data.responsible_person ||
        !data.responsible_phone
      ) {
        return res
          .status(400)
          .json(formatResponse.error("Не все обязательные поля заполнены"));
      }

      const object = await ObjectService.create(counterpartyId, data);

      res.status(201).json(formatResponse.created("Объект создан", object));
    } catch (error) {
      console.error("Ошибка создания объекта:", error);

      let statusCode = 500;
      if (error.message.includes("Некорректный")) {
        statusCode = 400;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Обновление объекта
  static async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      // Проверяем существование объекта
      const existing = await ObjectService.getById(id);
      if (!existing) {
        return res
          .status(404)
          .json(formatResponse.notFound("Объект не найден"));
      }

      const updated = await ObjectService.update(id, data);

      res.json(formatResponse.success("Объект обновлен", updated));
    } catch (error) {
      console.error("Ошибка обновления объекта:", error);

      let statusCode = 500;
      if (error.message.includes("Некорректный")) {
        statusCode = 400;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Деактивация объекта (мягкое удаление)
  static async deactivate(req, res) {
    try {
      const { id } = req.params;

      const result = await ObjectService.deactivate(id);

      res.json(formatResponse.success("Объект деактивирован", result));
    } catch (error) {
      console.error("Ошибка деактивации объекта:", error);

      if (error.message.includes("не найден")) {
        return res.status(404).json(formatResponse.notFound(error.message));
      }

      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось деактивировать объект",
            error.message,
          ),
        );
    }
  }

  // * Активация объекта
  static async activate(req, res) {
    try {
      const { id } = req.params;

      const result = await ObjectService.activate(id);

      res.json(formatResponse.success("Объект активирован", result));
    } catch (error) {
      console.error("Ошибка активации объекта:", error);

      if (error.message.includes("не найден")) {
        return res.status(404).json(formatResponse.notFound(error.message));
      }

      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось активировать объект",
            error.message,
          ),
        );
    }
  }

  // * Полное удаление объекта
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const result = await ObjectService.delete(id);

      res.json(formatResponse.success("Объект удален", { id: result }));
    } catch (error) {
      console.error("Ошибка удаления объекта:", error);

      if (error.message.includes("не найден")) {
        return res.status(404).json(formatResponse.notFound(error.message));
      }

      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось удалить объект",
            error.message,
          ),
        );
    }
  }

  // * Поиск объектов по адресу
  static async searchByAddress(req, res) {
    try {
      const { address } = req.params;

      const objects = await ObjectService.searchByAddress(address);

      res.json(formatResponse.success("Результаты поиска", objects));
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

  // * Поиск объектов по ответственному лицу
  static async searchByResponsiblePerson(req, res) {
    try {
      const { person } = req.params;

      const objects = await ObjectService.searchByResponsiblePerson(person);

      res.json(formatResponse.success("Результаты поиска", objects));
    } catch (error) {
      console.error("Ошибка поиска по ответственному лицу:", error);
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

  // * Поиск объектов по телефону ответственного
  static async searchByResponsiblePhone(req, res) {
    try {
      const { phone } = req.params;

      const objects = await ObjectService.searchByResponsiblePhone(phone);

      res.json(formatResponse.success("Результаты поиска", objects));
    } catch (error) {
      console.error("Ошибка поиска по телефону:", error);
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

  // * Статистика по объектам контрагента
  static async getCounterpartyStats(req, res) {
    try {
      const { counterpartyId } = req.params;

      // Проверяем, что контрагент существует
      const counterparty = await CounterpartyService.getById(counterpartyId);
      if (!counterparty) {
        return res
          .status(404)
          .json(formatResponse.notFound("Контрагент не найден"));
      }

      const stats = await ObjectService.getCounterpartyStats(counterpartyId);

      res.json(formatResponse.success("Статистика по объектам", stats));
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

  // * Глобальная статистика по всем объектам
  static async getGlobalStats(req, res) {
    try {
      const stats = await ObjectService.getGlobalStats();

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

  // * Копирование объекта
  static async duplicate(req, res) {
    try {
      const { id } = req.params;
      const { newCounterpartyId } = req.body;

      // Проверяем существование исходного объекта
      const existing = await ObjectService.getById(id);
      if (!existing) {
        return res
          .status(404)
          .json(formatResponse.notFound("Объект для копирования не найден"));
      }

      // Если указан новый контрагент, проверяем его существование
      if (newCounterpartyId) {
        const counterparty =
          await CounterpartyService.getById(newCounterpartyId);
        if (!counterparty) {
          return res
            .status(404)
            .json(formatResponse.notFound("Контрагент не найден"));
        }
      }

      const newObject = await ObjectService.duplicate(id, newCounterpartyId);

      res
        .status(201)
        .json(formatResponse.created("Объект скопирован", newObject));
    } catch (error) {
      console.error("Ошибка копирования объекта:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось скопировать объект",
            error.message,
          ),
        );
    }
  }

  // * Массовое обновление статуса объектов контрагента
  static async bulkUpdateStatus(req, res) {
    try {
      const { counterpartyId } = req.params;
      const { isActive } = req.body;

      if (isActive === undefined) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан статус для обновления"));
      }

      // Проверяем, что контрагент существует
      const counterparty = await CounterpartyService.getById(counterpartyId);
      if (!counterparty) {
        return res
          .status(404)
          .json(formatResponse.notFound("Контрагент не найден"));
      }

      const result = await ObjectService.bulkUpdateStatus(
        counterpartyId,
        isActive,
      );

      res.json(formatResponse.success("Статус объектов обновлен", result));
    } catch (error) {
      console.error("Ошибка массового обновления:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось обновить статусы",
            error.message,
          ),
        );
    }
  }

  // * Проверка наличия активных объектов у контрагента
  static async hasActiveObjects(req, res) {
    try {
      const { counterpartyId } = req.params;

      const hasActive = await ObjectService.hasActiveObjects(counterpartyId);

      res.json(formatResponse.success("Проверка выполнена", { hasActive }));
    } catch (error) {
      console.error("Ошибка проверки активных объектов:", error);
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
}

module.exports = ObjectController;
