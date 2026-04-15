const { Object, Counterparty, sequelize } = require("../db/models");
const { Op } = require("sequelize");
const formatPhone = require("../utils/formatPhone");

class ObjectService {
  // ============= ВАЛИДАЦИЯ =============

  static validatePhone(phone) {
    return formatPhone.validatePhone(phone);
  }

  static formatPhone(phone) {
    return formatPhone(phone);
  }

  static validateObjectData(data) {
    const { address, responsible_person, responsible_phone } = data;

    if (
      !address ||
      typeof address !== "string" ||
      address.trim().length === 0
    ) {
      return {
        isValid: false,
        error: "Адрес объекта обязателен",
      };
    }

    if (
      !responsible_person ||
      typeof responsible_person !== "string" ||
      responsible_person.trim().length === 0
    ) {
      return {
        isValid: false,
        error: "Ответственное лицо обязательно",
      };
    }

    if (
      !responsible_phone ||
      typeof responsible_phone !== "string" ||
      responsible_phone.trim().length === 0
    ) {
      return {
        isValid: false,
        error: "Контактный телефон ответственного лица обязателен",
      };
    }

    if (!this.validatePhone(responsible_phone)) {
      return {
        isValid: false,
        error: "Некорректный формат телефона",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  // ============= ОСНОВНЫЕ МЕТОДЫ =============

  // * Получение всех объектов (с фильтрацией)
  static async getAll(filters = {}) {
    const where = {};

    if (filters.counterparty_id) {
      where.counterparty_id = filters.counterparty_id;
    }
    if (filters.is_active !== undefined) {
      where.is_active = filters.is_active;
    }
    if (filters.search) {
      where[Op.or] = [
        { address: { [Op.iLike]: `%${filters.search}%` } },
        { responsible_person: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    const objects = await Object.findAll({
      where,
      include: [
        {
          model: Counterparty,
          as: "counterparty",
          attributes: [
            "id",
            "representative_name",
            "representative_phone",
            "person_type",
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return objects.map((o) => o.get({ plain: true }));
  }

  // * Получение объекта по ID
  static async getById(id) {
    const object = await Object.findByPk(id, {
      include: [
        {
          model: Counterparty,
          as: "counterparty",
        },
      ],
    });

    if (!object) return null;
    return object.get({ plain: true });
  }

  // * Получение всех объектов контрагента
  static async getByCounterpartyId(counterpartyId, includeInactive = false) {
    const where = { counterparty_id: counterpartyId };

    if (!includeInactive) {
      where.is_active = true;
    }

    const objects = await Object.findAll({
      where,
      order: [["created_at", "DESC"]],
    });

    return objects.map((o) => o.get({ plain: true }));
  }

  // * Создание нового объекта
  static async create(counterpartyId, data) {
    // Проверяем, что контрагент существует
    const counterparty = await Counterparty.findByPk(counterpartyId);
    if (!counterparty) {
      throw new Error("Контрагент не найден");
    }

    // Валидация данных
    const validation = this.validateObjectData(data);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Форматируем телефон
    const formattedPhone = this.formatPhone(data.responsible_phone);

    const object = await Object.create({
      counterparty_id: counterpartyId,
      address: data.address.trim(),
      responsible_person: data.responsible_person.trim(),
      responsible_phone: formattedPhone,
      notes: data.notes?.trim() || null,
      is_active: true,
    });

    return object.get({ plain: true });
  }

  // * Обновление объекта
  static async update(id, data) {
    const object = await Object.findByPk(id);
    if (!object) {
      throw new Error("Объект не найден");
    }

    // Если обновляется телефон, форматируем и проверяем
    if (data.responsible_phone) {
      const formattedPhone = this.formatPhone(data.responsible_phone);
      if (!formattedPhone) {
        throw new Error("Некорректный формат телефона");
      }
      data.responsible_phone = formattedPhone;
    }

    // Если обновляется адрес, обрезаем пробелы
    if (data.address) {
      data.address = data.address.trim();
    }

    // Если обновляется ответственное лицо, обрезаем пробелы
    if (data.responsible_person) {
      data.responsible_person = data.responsible_person.trim();
    }

    // Если обновляются заметки, обрезаем пробелы
    if (data.notes) {
      data.notes = data.notes.trim();
    }

    await object.update(data);
    return object.get({ plain: true });
  }

  // * Деактивация объекта (мягкое удаление)
  static async deactivate(id) {
    const object = await Object.findByPk(id);
    if (!object) {
      throw new Error("Объект не найден");
    }

    await object.update({ is_active: false });
    return { id, is_active: false };
  }

  // * Активация объекта
  static async activate(id) {
    const object = await Object.findByPk(id);
    if (!object) {
      throw new Error("Объект не найден");
    }

    await object.update({ is_active: true });
    return { id, is_active: true };
  }

  // * Полное удаление объекта
  static async delete(id) {
    const object = await Object.findByPk(id);
    if (!object) {
      throw new Error("Объект не найден");
    }

    await object.destroy();
    return id;
  }

  // ============= МЕТОДЫ ПОИСКА =============

  // * Поиск объектов по адресу
  static async searchByAddress(searchTerm) {
    if (!searchTerm || typeof searchTerm !== "string") return [];

    const objects = await Object.findAll({
      where: {
        address: { [Op.iLike]: `%${searchTerm.trim()}%` },
      },
      include: [
        {
          model: Counterparty,
          as: "counterparty",
        },
      ],
      order: [["address", "ASC"]],
    });

    return objects.map((o) => o.get({ plain: true }));
  }

  // * Поиск объектов по ответственному лицу
  static async searchByResponsiblePerson(searchTerm) {
    if (!searchTerm || typeof searchTerm !== "string") return [];

    const objects = await Object.findAll({
      where: {
        responsible_person: { [Op.iLike]: `%${searchTerm.trim()}%` },
      },
      include: [
        {
          model: Counterparty,
          as: "counterparty",
        },
      ],
    });

    return objects.map((o) => o.get({ plain: true }));
  }

  // * Поиск объектов по телефону ответственного
  static async searchByResponsiblePhone(phone) {
    const formattedPhone = this.formatPhone(phone);
    if (!formattedPhone) return [];

    const objects = await Object.findAll({
      where: {
        responsible_phone: formattedPhone,
      },
      include: [
        {
          model: Counterparty,
          as: "counterparty",
        },
      ],
    });

    return objects.map((o) => o.get({ plain: true }));
  }

  // ============= СТАТИСТИКА =============

  // * Статистика по объектам контрагента
  static async getCounterpartyStats(counterpartyId) {
    const total = await Object.count({
      where: { counterparty_id: counterpartyId },
    });

    const active = await Object.count({
      where: {
        counterparty_id: counterpartyId,
        is_active: true,
      },
    });

    const inactive = await Object.count({
      where: {
        counterparty_id: counterpartyId,
        is_active: false,
      },
    });

    return {
      counterparty_id: counterpartyId,
      total,
      active,
      inactive,
    };
  }

  // * Статистика по всем объектам
  static async getGlobalStats() {
    const total = await Object.count();

    const active = await Object.count({
      where: { is_active: true },
    });

    const inactive = await Object.count({
      where: { is_active: false },
    });

    // Используем sequelize из импорта в начале файла
    const byCounterparty = await Object.findAll({
      attributes: [
        "counterparty_id",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["counterparty_id"],
    });

    const topCounterparties = await Object.findAll({
      attributes: [
        "counterparty_id",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      where: { is_active: true },
      group: ["counterparty_id"],
      order: [[sequelize.fn("COUNT", sequelize.col("id")), "DESC"]],
      limit: 5,
      include: [
        {
          model: Counterparty,
          as: "counterparty",
          attributes: ["representative_name"],
        },
      ],
    });

    return {
      total,
      active,
      inactive,
      by_counterparty: byCounterparty.map((item) => item.get({ plain: true })),
      top_counterparties: topCounterparties.map((item) => ({
        counterparty_id: item.counterparty_id,
        counterparty_name: item.counterparty?.representative_name,
        count: parseInt(item.get("count")),
      })),
    };
  }

  // ============= ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ =============

  // * Копирование объекта (для быстрого создания похожего)
  static async duplicate(id, newCounterpartyId = null) {
    const object = await Object.findByPk(id);
    if (!object) {
      throw new Error("Объект не найден");
    }

    const objectData = object.get({ plain: true });
    delete objectData.id;
    delete objectData.created_at;
    delete objectData.updated_at;

    // Если указан новый контрагент, проверяем его существование
    if (newCounterpartyId) {
      const counterparty = await Counterparty.findByPk(newCounterpartyId);
      if (!counterparty) {
        throw new Error("Контрагент не найден");
      }
      objectData.counterparty_id = newCounterpartyId;
    }

    // Создаем копию
    const newObject = await Object.create({
      ...objectData,
      is_active: true, // Новый объект активен по умолчанию
    });

    return newObject.get({ plain: true });
  }

  // * Массовое обновление статуса объектов контрагента
  static async bulkUpdateStatus(counterpartyId, isActive) {
    const [updatedCount] = await Object.update(
      { is_active: isActive },
      {
        where: { counterparty_id: counterpartyId },
      },
    );

    return {
      counterparty_id: counterpartyId,
      updated_count: updatedCount,
      new_status: isActive,
    };
  }

  // * Проверка, есть ли у контрагента активные объекты
  static async hasActiveObjects(counterpartyId) {
    const count = await Object.count({
      where: {
        counterparty_id: counterpartyId,
        is_active: true,
      },
    });

    return count > 0;
  }

  // * Получение статистики по объектам за период
  static async getStatsByPeriod(startDate, endDate) {
    const where = {};

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at[Op.gte] = new Date(startDate);
      if (endDate) where.created_at[Op.lte] = new Date(endDate);
    }

    const total = await Object.count({ where });

    const active = await Object.count({
      where: { ...where, is_active: true },
    });

    return {
      period: { startDate, endDate },
      total,
      active,
      inactive: total - active,
    };
  }
}

module.exports = ObjectService;
