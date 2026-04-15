const CounterpartyService = require("../services/CounterpartyService");
const formatResponse = require("../utils/formatResponse");

class CounterpartyController {
  // * Получение всех контрагентов (с фильтрацией)
  static async getAll(req, res) {
    try {
      const filters = {
        counterparty_type: req.query.type,
        person_type: req.query.personType,
        is_active:
          req.query.isActive === "true"
            ? true
            : req.query.isActive === "false"
              ? false
              : undefined,
        search: req.query.search,
      };

      const counterparties = await CounterpartyService.getAll(filters);

      res.json(formatResponse.success("Контрагенты получены", counterparties));
    } catch (error) {
      console.error("Ошибка получения контрагентов:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить контрагентов",
            error.message,
          ),
        );
    }
  }

  // * Получение контрагента по ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const counterparty = await CounterpartyService.getById(id);

      if (!counterparty) {
        return res
          .status(404)
          .json(formatResponse.notFound("Контрагент не найден"));
      }

      res.json(formatResponse.success("Контрагент получен", counterparty));
    } catch (error) {
      console.error("Ошибка получения контрагента:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить контрагента",
            error.message,
          ),
        );
    }
  }

  // * Создание нового контрагента
  static async create(req, res) {
    try {
      const {
        counterparty_type,
        person_type,
        representative_name,
        representative_phone,
        email,
        phone,
      } = req.body;

      // Проверка обязательных полей
      if (
        !counterparty_type ||
        !person_type ||
        !representative_name ||
        !representative_phone
      ) {
        return res
          .status(400)
          .json(formatResponse.error("Не все обязательные поля заполнены"));
      }

      const counterparty = await CounterpartyService.create({
        counterparty_type,
        person_type,
        representative_name,
        representative_phone,
        email,
        phone,
      });

      res
        .status(201)
        .json(formatResponse.created("Контрагент создан", counterparty));
    } catch (error) {
      console.error("Ошибка создания контрагента:", error);

      let statusCode = 500;
      if (
        error.message.includes("уже существует") ||
        error.message.includes("обязателен")
      ) {
        statusCode = 400;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Обновление контрагента
  static async update(req, res) {
    try {
      const { id } = req.params;

      // Проверяем существование
      const existing = await CounterpartyService.getById(id);
      if (!existing) {
        return res
          .status(404)
          .json(formatResponse.notFound("Контрагент не найден"));
      }

      const updated = await CounterpartyService.update(id, req.body);

      res.json(formatResponse.success("Контрагент обновлен", updated));
    } catch (error) {
      console.error("Ошибка обновления контрагента:", error);

      let statusCode = 500;
      if (
        error.message.includes("уже существует") ||
        error.message.includes("некорректный")
      ) {
        statusCode = 400;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Деактивация контрагента (мягкое удаление)
  static async deactivate(req, res) {
    try {
      const { id } = req.params;

      const result = await CounterpartyService.deactivate(id);

      res.json(formatResponse.success("Контрагент деактивирован", result));
    } catch (error) {
      console.error("Ошибка деактивации контрагента:", error);

      if (error.message.includes("не найден")) {
        return res.status(404).json(formatResponse.notFound(error.message));
      }

      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось деактивировать контрагента",
            error.message,
          ),
        );
    }
  }

  // * Активация контрагента
  static async activate(req, res) {
    try {
      const { id } = req.params;

      const result = await CounterpartyService.activate(id);

      res.json(formatResponse.success("Контрагент активирован", result));
    } catch (error) {
      console.error("Ошибка активации контрагента:", error);

      if (error.message.includes("не найден")) {
        return res.status(404).json(formatResponse.notFound(error.message));
      }

      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось активировать контрагента",
            error.message,
          ),
        );
    }
  }

  // * Полное удаление (только для админа)
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const result = await CounterpartyService.delete(id);

      res.json(formatResponse.success("Контрагент удален", { id: result }));
    } catch (error) {
      console.error("Ошибка удаления контрагента:", error);

      if (error.message.includes("не найден")) {
        return res.status(404).json(formatResponse.notFound(error.message));
      }

      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось удалить контрагента",
            error.message,
          ),
        );
    }
  }

  // * Поиск по телефону
  static async findByPhone(req, res) {
    try {
      const { phone } = req.params;

      const counterparty = await CounterpartyService.findByPhone(phone);

      if (!counterparty) {
        return res
          .status(404)
          .json(
            formatResponse.notFound("Контрагент с таким телефоном не найден"),
          );
      }

      res.json(formatResponse.success("Контрагент найден", counterparty));
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

  // * Поиск по email
  static async findByEmail(req, res) {
    try {
      const { email } = req.params;

      const counterparty = await CounterpartyService.findByEmail(email);

      if (!counterparty) {
        return res
          .status(404)
          .json(formatResponse.notFound("Контрагент с таким email не найден"));
      }

      res.json(formatResponse.success("Контрагент найден", counterparty));
    } catch (error) {
      console.error("Ошибка поиска по email:", error);
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

  // * Поиск по ИНН
  static async findByINN(req, res) {
    try {
      const { inn } = req.params;

      const counterparty = await CounterpartyService.findByINN(inn);

      if (!counterparty) {
        return res
          .status(404)
          .json(formatResponse.notFound("Контрагент с таким ИНН не найден"));
      }

      res.json(formatResponse.success("Контрагент найден", counterparty));
    } catch (error) {
      console.error("Ошибка поиска по ИНН:", error);
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

  // * Поиск по названию компании
  static async findByCompanyName(req, res) {
    try {
      const { name } = req.params;

      const counterparties = await CounterpartyService.findByCompanyName(name);

      res.json(formatResponse.success("Результаты поиска", counterparties));
    } catch (error) {
      console.error("Ошибка поиска по названию:", error);
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

  // * Поиск по имени представителя
  static async findByRepresentativeName(req, res) {
    try {
      const { name } = req.params;

      const counterparties =
        await CounterpartyService.findByRepresentativeName(name);

      res.json(formatResponse.success("Результаты поиска", counterparties));
    } catch (error) {
      console.error("Ошибка поиска по имени:", error);
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

  // * Универсальный поиск
  static async searchAll(req, res) {
    try {
      const { q } = req.query;

      if (!q) {
        return res
          .status(400)
          .json(formatResponse.error("Поисковый запрос не может быть пустым"));
      }

      const results = await CounterpartyService.searchAll(q);

      res.json(formatResponse.success("Результаты поиска", results));
    } catch (error) {
      console.error("Ошибка универсального поиска:", error);
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
}

module.exports = CounterpartyController;
