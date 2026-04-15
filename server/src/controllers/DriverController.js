const { Op } = require("sequelize");
const DriverService = require("../services/DriverService");
const UserService = require("../services/User.service");
const formatResponse = require("../utils/formatResponse");

class DriverController {
  // * Получение всех водителей (с фильтрацией)
  static async getAll(req, res) {
    try {
      const filters = {
        driver_type: req.query.type,
        is_active:
          req.query.isActive === "true"
            ? true
            : req.query.isActive === "false"
              ? false
              : undefined,
        search: req.query.search,
      };

      const drivers = await DriverService.getAll(filters);

      res.json(formatResponse.success("Водители получены", drivers));
    } catch (error) {
      console.error("Ошибка получения водителей:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить водителей",
            error.message,
          ),
        );
    }
  }

  // * Получение водителя по ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const driver = await DriverService.getById(id);

      if (!driver) {
        return res
          .status(404)
          .json(formatResponse.notFound("Водитель не найден"));
      }

      res.json(formatResponse.success("Водитель получен", driver));
    } catch (error) {
      console.error("Ошибка получения водителя:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить водителя",
            error.message,
          ),
        );
    }
  }

  // * Создание нового водителя (только для админа/менеджера)
  static async create(req, res) {
    try {
      const data = req.body;

      // Проверка обязательных полей
      if (!data.full_name || !data.phone || !data.driver_type) {
        return res
          .status(400)
          .json(formatResponse.error("Не все обязательные поля заполнены"));
      }

      // Если указан user_id, проверяем что пользователь с ролью driver существует
      if (data.user_id) {
        const user = await UserService.getOneUser(data.user_id);
        if (!user) {
          return res
            .status(404)
            .json(formatResponse.notFound("Пользователь не найден"));
        }
        if (user.role !== "driver") {
          return res
            .status(400)
            .json(
              formatResponse.error(
                "Указанный пользователь не имеет роли водителя",
              ),
            );
        }
      }

      const driver = await DriverService.create(data);

      res.status(201).json(formatResponse.created("Водитель создан", driver));
    } catch (error) {
      console.error("Ошибка создания водителя:", error);

      let statusCode = 500;
      if (
        error.message.includes("уже существует") ||
        error.message.includes("обязательно") ||
        error.message.includes("Некорректный")
      ) {
        statusCode = 400;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Обновление водителя (только для админа/менеджера)
  static async update(req, res) {
    try {
      const { id } = req.params;
      const data = req.body;

      // Проверяем существование водителя
      const existing = await DriverService.getById(id);
      if (!existing) {
        return res
          .status(404)
          .json(formatResponse.notFound("Водитель не найден"));
      }

      // Если обновляется user_id, проверяем пользователя
      if (data.user_id && data.user_id !== existing.user_id) {
        const user = await UserService.getOneUser(data.user_id);
        if (!user) {
          return res
            .status(404)
            .json(formatResponse.notFound("Пользователь не найден"));
        }
        if (user.role !== "driver") {
          return res
            .status(400)
            .json(
              formatResponse.error(
                "Указанный пользователь не имеет роли водителя",
              ),
            );
        }
      }

      const updated = await DriverService.update(id, data);

      res.json(formatResponse.success("Водитель обновлен", updated));
    } catch (error) {
      console.error("Ошибка обновления водителя:", error);

      let statusCode = 500;
      if (
        error.message.includes("уже существует") ||
        error.message.includes("Некорректный")
      ) {
        statusCode = 400;
      }

      res
        .status(statusCode)
        .json(formatResponse.error(error.message, null, statusCode));
    }
  }

  // * Деактивация водителя (мягкое удаление)
  static async deactivate(req, res) {
    try {
      const { id } = req.params;

      const result = await DriverService.deactivate(id);

      res.json(formatResponse.success("Водитель деактивирован", result));
    } catch (error) {
      console.error("Ошибка деактивации водителя:", error);

      if (error.message.includes("не найден")) {
        return res.status(404).json(formatResponse.notFound(error.message));
      }

      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось деактивировать водителя",
            error.message,
          ),
        );
    }
  }

  // * Активация водителя
  static async activate(req, res) {
    try {
      const { id } = req.params;

      const result = await DriverService.activate(id);

      res.json(formatResponse.success("Водитель активирован", result));
    } catch (error) {
      console.error("Ошибка активации водителя:", error);

      if (error.message.includes("не найден")) {
        return res.status(404).json(formatResponse.notFound(error.message));
      }

      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось активировать водителя",
            error.message,
          ),
        );
    }
  }

  // * Удаление водителя (только для админа)
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const result = await DriverService.delete(id);

      res.json(formatResponse.success("Водитель удален", { id: result }));
    } catch (error) {
      console.error("Ошибка удаления водителя:", error);

      if (error.message.includes("не найден")) {
        return res.status(404).json(formatResponse.notFound(error.message));
      }

      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось удалить водителя",
            error.message,
          ),
        );
    }
  }

  // * Поиск по госномеру
  static async searchByLicensePlate(req, res) {
    try {
      const { licensePlate } = req.params;

      const drivers = await DriverService.searchByLicensePlate(licensePlate);

      res.json(formatResponse.success("Результаты поиска", drivers));
    } catch (error) {
      console.error("Ошибка поиска по госномеру:", error);
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

  // * Получение водителей с истекающими документами
  static async getExpiringDocuments(req, res) {
    try {
      const days = req.query.days ? parseInt(req.query.days) : 30;

      const drivers = await DriverService.getExpiringDocuments(days);

      res.json(
        formatResponse.success("Водители с истекающими документами", drivers),
      );
    } catch (error) {
      console.error(
        "Ошибка получения водителей с истекающими документами:",
        error,
      );
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить список",
            error.message,
          ),
        );
    }
  }

  // * Получение водителей по типу
  static async getByType(req, res) {
    try {
      const { type } = req.params;

      if (!["company", "external"].includes(type)) {
        return res
          .status(400)
          .json(formatResponse.error("Некорректный тип водителя"));
      }

      const drivers = await DriverService.getByType(type);

      res.json(formatResponse.success(`Водители типа ${type}`, drivers));
    } catch (error) {
      console.error("Ошибка получения водителей по типу:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить водителей",
            error.message,
          ),
        );
    }
  }

  // * Получение свободных водителей
  static async getAvailableDrivers(req, res) {
    try {
      const drivers = await DriverService.getAvailableDrivers();

      res.json(formatResponse.success("Свободные водители", drivers));
    } catch (error) {
      console.error("Ошибка получения свободных водителей:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить список",
            error.message,
          ),
        );
    }
  }

  // * Статистика по водителям
  static async getStats(req, res) {
    try {
      const stats = await DriverService.getStats();

      res.json(formatResponse.success("Статистика по водителям", stats));
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

  // * Отметка об отправке уведомления
  static async markNotified(req, res) {
    try {
      const { id } = req.params;
      const { type } = req.body;

      if (!type || !["inspection", "permit", "insurance"].includes(type)) {
        return res
          .status(400)
          .json(formatResponse.error("Некорректный тип уведомления"));
      }

      const driver = await DriverService.markNotified(id, type);

      res.json(formatResponse.success("Уведомление отмечено", driver));
    } catch (error) {
      console.error("Ошибка отметки уведомления:", error);

      if (error.message.includes("не найден")) {
        return res.status(404).json(formatResponse.notFound(error.message));
      }

      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось отметить уведомление",
            error.message,
          ),
        );
    }
  }

  // * Получение текущего водителя (для авторизованного пользователя-водителя)
  static async getCurrentDriver(req, res) {
    try {
      const userId = res.locals.user.id;

      const { Driver } = require("../db/models");

      const driver = await Driver.findOne({
        where: { user_id: userId },
        include: [
          {
            model: require("../db/models").User,
            as: "user_info",
            attributes: ["id", "email", "full_name", "role"],
          },
          {
            model: require("../db/models").Order,
            as: "assigned_orders",
            where: {
              status: { [Op.notIn]: ["completed", "cancelled"] },
            },
            required: false,
            limit: 5,
            order: [["created_at", "DESC"]],
          },
        ],
      });

      if (!driver) {
        return res
          .status(404)
          .json(formatResponse.notFound("Профиль водителя не найден"));
      }

      res.json(
        formatResponse.success("Профиль водителя", driver.get({ plain: true })),
      );
    } catch (error) {
      console.error("Ошибка получения профиля водителя:", error);
      res
        .status(500)
        .json(
          formatResponse.serverError(
            "Не удалось получить профиль",
            error.message,
          ),
        );
    }
  }
}

module.exports = DriverController;
