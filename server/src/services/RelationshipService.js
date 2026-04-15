const { Relationship, Counterparty, sequelize } = require("../db/models");
const { Op } = require("sequelize");

class RelationshipService {
  // ============= ВАЛИДАЦИЯ =============

  static validateRelationshipData(data) {
    const {
      client_id,
      executor_id,
      relationship_type,
      contract_number,
      contract_date,
    } = data;

    if (!client_id) {
      return {
        isValid: false,
        error: "ID клиента обязателен",
      };
    }

    if (!executor_id) {
      return {
        isValid: false,
        error: "ID исполнителя обязателен",
      };
    }

    if (client_id === executor_id) {
      return {
        isValid: false,
        error: "Клиент и исполнитель не могут быть одним и тем же лицом",
      };
    }

    if (
      !relationship_type ||
      !["service_provider", "subcontractor"].includes(relationship_type)
    ) {
      return {
        isValid: false,
        error: "Некорректный тип связи",
      };
    }

    // Валидация даты договора, если она указана
    if (contract_date && isNaN(Date.parse(contract_date))) {
      return {
        isValid: false,
        error: "Некорректный формат даты договора",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  // ============= ОСНОВНЫЕ МЕТОДЫ =============

  // * Получение всех связей (с фильтрацией)
  static async getAll(filters = {}) {
    const where = {};

    if (filters.client_id) {
      where.client_id = filters.client_id;
    }
    if (filters.executor_id) {
      where.executor_id = filters.executor_id;
    }
    if (filters.relationship_type) {
      where.relationship_type = filters.relationship_type;
    }
    if (filters.is_active !== undefined) {
      where.is_active = filters.is_active;
    }
    if (filters.search) {
      where[Op.or] = [
        { contract_number: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    const relationships = await Relationship.findAll({
      where,
      include: [
        {
          model: Counterparty,
          as: "client",
          attributes: [
            "id",
            "representative_name",
            "representative_phone",
            "person_type",
            "counterparty_type",
          ],
        },
        {
          model: Counterparty,
          as: "executor",
          attributes: [
            "id",
            "representative_name",
            "representative_phone",
            "person_type",
            "counterparty_type",
          ],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return relationships.map((r) => r.get({ plain: true }));
  }

  // * Получение связи по ID
  static async getById(id) {
    const relationship = await Relationship.findByPk(id, {
      include: [
        {
          model: Counterparty,
          as: "client",
        },
        {
          model: Counterparty,
          as: "executor",
        },
      ],
    });

    if (!relationship) return null;
    return relationship.get({ plain: true });
  }

  // * Получение всех связей клиента
  static async getByClientId(clientId, includeInactive = false) {
    const where = { client_id: clientId };

    if (!includeInactive) {
      where.is_active = true;
    }

    const relationships = await Relationship.findAll({
      where,
      include: [
        {
          model: Counterparty,
          as: "executor",
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

    return relationships.map((r) => r.get({ plain: true }));
  }

  // * Получение всех связей исполнителя
  static async getByExecutorId(executorId, includeInactive = false) {
    const where = { executor_id: executorId };

    if (!includeInactive) {
      where.is_active = true;
    }

    const relationships = await Relationship.findAll({
      where,
      include: [
        {
          model: Counterparty,
          as: "client",
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

    return relationships.map((r) => r.get({ plain: true }));
  }

  // * Создание новой связи
  static async create(data) {
    // Валидация данных
    const validation = this.validateRelationshipData(data);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const {
      client_id,
      executor_id,
      relationship_type,
      contract_number,
      contract_date,
      notes,
    } = data;

    // Проверяем, что клиент существует
    const client = await Counterparty.findByPk(client_id);
    if (!client) {
      throw new Error("Клиент не найден");
    }

    // Проверяем, что клиент может быть клиентом
    if (!["client", "both"].includes(client.counterparty_type)) {
      throw new Error("Указанный контрагент не может быть клиентом");
    }

    // Проверяем, что исполнитель существует
    const executor = await Counterparty.findByPk(executor_id);
    if (!executor) {
      throw new Error("Исполнитель не найден");
    }

    // Проверяем, что исполнитель может быть исполнителем
    if (!["executor", "both"].includes(executor.counterparty_type)) {
      throw new Error("Указанный контрагент не может быть исполнителем");
    }

    // Проверяем на дубликат связи
    const existing = await Relationship.findOne({
      where: {
        client_id,
        executor_id,
      },
    });

    if (existing) {
      throw new Error("Связь между этими контрагентами уже существует");
    }

    const relationship = await Relationship.create({
      client_id,
      executor_id,
      relationship_type,
      contract_number: contract_number?.trim() || null,
      contract_date: contract_date || null,
      notes: notes?.trim() || null,
      is_active: true,
    });

    return relationship.get({ plain: true });
  }

  // * Обновление связи
  static async update(id, data) {
    const relationship = await Relationship.findByPk(id);
    if (!relationship) {
      throw new Error("Связь не найдена");
    }

    // Нельзя изменить клиента или исполнителя через update
    // Для этого нужно создать новую связь
    if (data.client_id || data.executor_id) {
      throw new Error("Для изменения участников связи создайте новую связь");
    }

    // Валидация даты, если обновляется
    if (data.contract_date && isNaN(Date.parse(data.contract_date))) {
      throw new Error("Некорректный формат даты договора");
    }

    await relationship.update(data);
    return relationship.get({ plain: true });
  }

  // * Деактивация связи (мягкое удаление)
  static async deactivate(id) {
    const relationship = await Relationship.findByPk(id);
    if (!relationship) {
      throw new Error("Связь не найдена");
    }

    await relationship.update({ is_active: false });
    return { id, is_active: false };
  }

  // * Активация связи
  static async activate(id) {
    const relationship = await Relationship.findByPk(id);
    if (!relationship) {
      throw new Error("Связь не найдена");
    }

    await relationship.update({ is_active: true });
    return { id, is_active: true };
  }

  // * Полное удаление связи
  static async delete(id) {
    const relationship = await Relationship.findByPk(id);
    if (!relationship) {
      throw new Error("Связь не найдена");
    }

    await relationship.destroy();
    return id;
  }

  // ============= МЕТОДЫ ПОИСКА =============

  // * Поиск по договору
  static async searchByContractNumber(contractNumber) {
    if (!contractNumber) return [];

    const relationships = await Relationship.findAll({
      where: {
        contract_number: { [Op.iLike]: `%${contractNumber.trim()}%` },
      },
      include: [
        {
          model: Counterparty,
          as: "client",
          attributes: ["id", "representative_name"],
        },
        {
          model: Counterparty,
          as: "executor",
          attributes: ["id", "representative_name"],
        },
      ],
    });

    return relationships.map((r) => r.get({ plain: true }));
  }

  // * Поиск по дате договора
  static async searchByContractDate(date) {
    if (!date) return [];

    const relationships = await Relationship.findAll({
      where: {
        contract_date: date,
      },
      include: [
        {
          model: Counterparty,
          as: "client",
        },
        {
          model: Counterparty,
          as: "executor",
        },
      ],
    });

    return relationships.map((r) => r.get({ plain: true }));
  }

  // * Поиск связей по типу
  static async getByType(relationshipType, includeInactive = false) {
    const where = { relationship_type: relationshipType };

    if (!includeInactive) {
      where.is_active = true;
    }

    const relationships = await Relationship.findAll({
      where,
      include: [
        {
          model: Counterparty,
          as: "client",
        },
        {
          model: Counterparty,
          as: "executor",
        },
      ],
    });

    return relationships.map((r) => r.get({ plain: true }));
  }

  // ============= СТАТИСТИКА =============

  // * Статистика по связям клиента
  static async getClientStats(clientId) {
    const total = await Relationship.count({
      where: { client_id: clientId },
    });

    const active = await Relationship.count({
      where: {
        client_id: clientId,
        is_active: true,
      },
    });

    const byType = await Relationship.findAll({
      where: { client_id: clientId },
      attributes: [
        "relationship_type",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["relationship_type"],
    });

    const byExecutor = await Relationship.findAll({
      where: { client_id: clientId, is_active: true },
      attributes: [
        "executor_id",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["executor_id"],
      include: [
        {
          model: Counterparty,
          as: "executor",
          attributes: ["representative_name"],
        },
      ],
    });

    return {
      client_id: clientId,
      total,
      active,
      by_type: byType.map((item) => item.get({ plain: true })),
      by_executor: byExecutor.map((item) => ({
        executor_id: item.executor_id,
        executor_name: item.executor?.representative_name,
        count: parseInt(item.get("count")),
      })),
    };
  }

  // * Статистика по связям исполнителя
  static async getExecutorStats(executorId) {
    const total = await Relationship.count({
      where: { executor_id: executorId },
    });

    const active = await Relationship.count({
      where: {
        executor_id: executorId,
        is_active: true,
      },
    });

    const byType = await Relationship.findAll({
      where: { executor_id: executorId },
      attributes: [
        "relationship_type",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["relationship_type"],
    });

    const byClient = await Relationship.findAll({
      where: { executor_id: executorId, is_active: true },
      attributes: [
        "client_id",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["client_id"],
      include: [
        {
          model: Counterparty,
          as: "client",
          attributes: ["representative_name"],
        },
      ],
    });

    return {
      executor_id: executorId,
      total,
      active,
      by_type: byType.map((item) => item.get({ plain: true })),
      by_client: byClient.map((item) => ({
        client_id: item.client_id,
        client_name: item.client?.representative_name,
        count: parseInt(item.get("count")),
      })),
    };
  }

  // * Общая статистика
  static async getGlobalStats() {
    const total = await Relationship.count();

    const active = await Relationship.count({
      where: { is_active: true },
    });

    const byType = await Relationship.findAll({
      attributes: [
        "relationship_type",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["relationship_type"],
    });

    const topClients = await Relationship.findAll({
      attributes: [
        "client_id",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      where: { is_active: true },
      group: ["client_id"],
      order: [[sequelize.fn("COUNT", sequelize.col("id")), "DESC"]],
      limit: 5,
      include: [
        {
          model: Counterparty,
          as: "client",
          attributes: ["representative_name"],
        },
      ],
    });

    const topExecutors = await Relationship.findAll({
      attributes: [
        "executor_id",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      where: { is_active: true },
      group: ["executor_id"],
      order: [[sequelize.fn("COUNT", sequelize.col("id")), "DESC"]],
      limit: 5,
      include: [
        {
          model: Counterparty,
          as: "executor",
          attributes: ["representative_name"],
        },
      ],
    });

    return {
      total,
      active,
      inactive: total - active,
      by_type: byType.map((item) => item.get({ plain: true })),
      top_clients: topClients.map((item) => ({
        client_id: item.client_id,
        client_name: item.client?.representative_name,
        count: parseInt(item.get("count")),
      })),
      top_executors: topExecutors.map((item) => ({
        executor_id: item.executor_id,
        executor_name: item.executor?.representative_name,
        count: parseInt(item.get("count")),
      })),
    };
  }

  // ============= ПРОВЕРОЧНЫЕ МЕТОДЫ =============

  // * Проверка, есть ли активная связь между клиентом и исполнителем
  static async hasActiveRelationship(clientId, executorId) {
    const count = await Relationship.count({
      where: {
        client_id: clientId,
        executor_id: executorId,
        is_active: true,
      },
    });

    return count > 0;
  }

  // * Получение всех исполнителей клиента
  static async getClientExecutors(clientId, includeInactive = false) {
    const relationships = await this.getByClientId(clientId, includeInactive);
    return relationships.map((r) => r.executor);
  }

  // * Получение всех клиентов исполнителя
  static async getExecutorClients(executorId, includeInactive = false) {
    const relationships = await this.getByExecutorId(
      executorId,
      includeInactive,
    );
    return relationships.map((r) => r.client);
  }

  // ============= НОВЫЕ МЕТОДЫ =============

  // * Получение всех связей с истекающими договорами
  static async getExpiringContracts(daysThreshold = 30) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const relationships = await Relationship.findAll({
      where: {
        contract_date: {
          [Op.lte]: thresholdDate,
          [Op.gte]: new Date(),
        },
        is_active: true,
      },
      include: [
        {
          model: Counterparty,
          as: "client",
        },
        {
          model: Counterparty,
          as: "executor",
        },
      ],
      order: [["contract_date", "ASC"]],
    });

    return relationships.map((r) => r.get({ plain: true }));
  }

  // * Получение связей без договора
  static async getWithoutContract() {
    const relationships = await Relationship.findAll({
      where: {
        contract_number: null,
        is_active: true,
      },
      include: [
        {
          model: Counterparty,
          as: "client",
        },
        {
          model: Counterparty,
          as: "executor",
        },
      ],
    });

    return relationships.map((r) => r.get({ plain: true }));
  }

  // * Массовое обновление статуса связей клиента
  static async bulkUpdateByClient(clientId, isActive) {
    const [updatedCount] = await Relationship.update(
      { is_active: isActive },
      {
        where: { client_id: clientId },
      },
    );

    return {
      client_id: clientId,
      updated_count: updatedCount,
      new_status: isActive,
    };
  }

  // * Массовое обновление статуса связей исполнителя
  static async bulkUpdateByExecutor(executorId, isActive) {
    const [updatedCount] = await Relationship.update(
      { is_active: isActive },
      {
        where: { executor_id: executorId },
      },
    );

    return {
      executor_id: executorId,
      updated_count: updatedCount,
      new_status: isActive,
    };
  }
}

module.exports = RelationshipService;

