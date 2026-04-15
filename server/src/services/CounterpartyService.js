const {
  Counterparty,
  CompanyDetail,
  Object,
  Relationship,
} = require("../db/models");
const { Op } = require("sequelize");
const formatPhone = require("../utils/formatPhone");

class CounterpartyService {
  // ============= ВАЛИДАЦИЯ =============

  static validatePhone(phone) {
    // Используем утилиту форматирования телефона
    return formatPhone.validatePhone(phone);
  }

  static formatPhone(phone) {
    // Форматируем телефон через утилиту
    return formatPhone(phone);
  }

  static validateEmail(email) {
    const emailPattern = /^[A-z0-9._%+-]+@[A-z0-9.-]+\.[A-z]{2,}$/;
    return emailPattern.test(email);
  }

  static validateCounterpartyData(data) {
    const {
      counterparty_type,
      person_type,
      representative_name,
      representative_phone,
      email,
    } = data;

    if (
      !counterparty_type ||
      !["client", "executor", "both"].includes(counterparty_type)
    ) {
      return {
        isValid: false,
        error: "Некорректный тип контрагента",
      };
    }

    if (
      !person_type ||
      !["individual", "llc", "entrepreneur"].includes(person_type)
    ) {
      return {
        isValid: false,
        error: "Некорректный тип лица",
      };
    }

    if (
      !representative_name ||
      typeof representative_name !== "string" ||
      representative_name.trim().length === 0
    ) {
      return {
        isValid: false,
        error: "Имя представителя обязательно",
      };
    }

    if (
      !representative_phone ||
      typeof representative_phone !== "string" ||
      representative_phone.trim().length === 0
    ) {
      return {
        isValid: false,
        error: "Телефон представителя обязателен",
      };
    }

    // Валидация телефона через утилиту
    if (!this.validatePhone(representative_phone)) {
      return {
        isValid: false,
        error: "Некорректный формат телефона",
      };
    }

    if (email && !this.validateEmail(email)) {
      return {
        isValid: false,
        error: "Некорректный email",
      };
    }

    return {
      isValid: true,
      error: null,
    };
  }

  // ============= ОСНОВНЫЕ МЕТОДЫ =============

  // * Получение всех контрагентов
  static async getAll(filters = {}) {
    const where = {};

    if (filters.counterparty_type) {
      where.counterparty_type = filters.counterparty_type;
    }
    if (filters.person_type) {
      where.person_type = filters.person_type;
    }
    if (filters.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    const counterparties = await Counterparty.findAll({
      where,
      include: [
        {
          model: CompanyDetail,
          as: "company_details",
          required: false,
        },
        {
          model: Object,
          as: "objects",
          required: false,
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return counterparties.map((c) => c.get({ plain: true }));
  }

  // * Получение одного контрагента по ID
  static async getById(id) {
    const counterparty = await Counterparty.findByPk(id, {
      include: [
        {
          model: CompanyDetail,
          as: "company_details",
          required: false,
        },
        {
          model: Object,
          as: "objects",
          required: false,
        },
        {
          model: Relationship,
          as: "client_relationships",
          include: [
            {
              model: Counterparty,
              as: "executor",
              attributes: ["id", "representative_name", "representative_phone"],
            },
          ],
          required: false,
        },
        {
          model: Relationship,
          as: "executor_relationships",
          include: [
            {
              model: Counterparty,
              as: "client",
              attributes: ["id", "representative_name", "representative_phone"],
            },
          ],
          required: false,
        },
      ],
    });

    if (!counterparty) return null;
    return counterparty.get({ plain: true });
  }

  // * Создание нового контрагента
  static async create(data) {
    // Валидация
    const validation = this.validateCounterpartyData(data);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const {
      counterparty_type,
      person_type,
      representative_name,
      representative_phone,
      email,
      phone,
    } = data;

    // Форматируем телефоны
    const formattedRepresentativePhone = this.formatPhone(representative_phone);
    const formattedPhone = phone ? this.formatPhone(phone) : null;

    // Проверка на дубликат телефона
    const whereConditions = [
      { representative_phone: formattedRepresentativePhone },
    ];

    // Добавляем проверку phone только если он передан
    if (formattedPhone) {
      whereConditions.push({ phone: formattedPhone });
    }

    const existing = await Counterparty.findOne({
      where: {
        [Op.or]: whereConditions,
      },
    });

    if (existing) {
      throw new Error("Контрагент с таким телефоном уже существует");
    }

    const counterparty = await Counterparty.create({
      counterparty_type,
      person_type,
      representative_name: representative_name.trim(),
      representative_phone: formattedRepresentativePhone,
      email: email ? email.trim().toLowerCase() : null,
      phone: formattedPhone,
      is_active: true,
    });

    return counterparty.get({ plain: true });
  }

  // * Обновление контрагента
  static async update(id, data) {
    const counterparty = await Counterparty.findByPk(id);
    if (!counterparty) {
      throw new Error("Контрагент не найден");
    }

    // Если меняется телефон, форматируем и проверяем
    if (data.representative_phone) {
      const formattedPhone = this.formatPhone(data.representative_phone);
      if (!formattedPhone) {
        throw new Error("Некорректный формат телефона");
      }

      if (formattedPhone !== counterparty.representative_phone) {
        const existing = await Counterparty.findOne({
          where: { representative_phone: formattedPhone },
        });
        if (existing) {
          throw new Error("Контрагент с таким телефоном уже существует");
        }
      }
      data.representative_phone = formattedPhone;
    }

    await counterparty.update(data);
    return counterparty.get({ plain: true });
  }

  // * Деактивация контрагента (мягкое удаление)
  static async deactivate(id) {
    const counterparty = await Counterparty.findByPk(id);
    if (!counterparty) {
      throw new Error("Контрагент не найден");
    }

    await counterparty.update({ is_active: false });
    return { id, is_active: false };
  }

  // * Активация контрагента
  static async activate(id) {
    const counterparty = await Counterparty.findByPk(id);
    if (!counterparty) {
      throw new Error("Контрагент не найден");
    }

    await counterparty.update({ is_active: true });
    return { id, is_active: true };
  }

  // * Полное удаление (только для админа)
  static async delete(id) {
    const counterparty = await Counterparty.findByPk(id);
    if (!counterparty) {
      throw new Error("Контрагент не найден");
    }

    await counterparty.destroy();
    return id;
  }

  // * Поиск по телефону
  static async findByPhone(phone) {
    const formattedPhone = this.formatPhone(phone);
    if (!formattedPhone) return null;

    const counterparty = await Counterparty.findOne({
      where: {
        [Op.or]: [
          { representative_phone: formattedPhone },
          { phone: formattedPhone },
        ],
      },
    });

    return counterparty ? counterparty.get({ plain: true }) : null;
  }

  // * Поиск по email
  static async findByEmail(email) {
    const counterparty = await Counterparty.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    return counterparty ? counterparty.get({ plain: true }) : null;
  }

  // ============= НОВЫЕ МЕТОДЫ ПОИСКА =============

  // * Поиск по ИНН (через CompanyDetail)
  static async findByINN(inn) {
    if (!inn || typeof inn !== "string") return null;

    const companyDetail = await CompanyDetail.findOne({
      where: { inn: inn.replace(/\D/g, "") },
      include: [
        {
          model: Counterparty,
          as: "counterparty",
        },
      ],
    });

    if (!companyDetail || !companyDetail.counterparty) return null;

    const result = companyDetail.counterparty.get({ plain: true });
    result.company_details = companyDetail.get({ plain: true });
    return result;
  }

  // * Поиск по названию компании (полному или краткому)
  static async findByCompanyName(searchTerm) {
    if (!searchTerm || typeof searchTerm !== "string") return [];

    const searchPattern = `%${searchTerm.trim()}%`;

    const companyDetails = await CompanyDetail.findAll({
      where: {
        [Op.or]: [
          { full_name_org: { [Op.iLike]: searchPattern } },
          { short_name_org: { [Op.iLike]: searchPattern } },
        ],
      },
      include: [
        {
          model: Counterparty,
          as: "counterparty",
        },
      ],
    });

    return companyDetails
      .filter((cd) => cd.counterparty)
      .map((cd) => {
        const result = cd.counterparty.get({ plain: true });
        result.company_details = cd.get({ plain: true });
        return result;
      });
  }

  // * Поиск по имени представителя (для физлиц)
  static async findByRepresentativeName(searchTerm) {
    if (!searchTerm || typeof searchTerm !== "string") return [];

    const searchPattern = `%${searchTerm.trim()}%`;

    const counterparties = await Counterparty.findAll({
      where: {
        representative_name: { [Op.iLike]: searchPattern },
      },
      include: [
        {
          model: CompanyDetail,
          as: "company_details",
          required: false,
        },
      ],
    });

    return counterparties.map((c) => c.get({ plain: true }));
  }

  // * Универсальный поиск по всем текстовым полям
  static async searchAll(searchTerm) {
    if (!searchTerm || typeof searchTerm !== "string") return [];

    const searchPattern = `%${searchTerm.trim()}%`;

    // Ищем в Counterparty
    const counterpartyResults = await Counterparty.findAll({
      where: {
        [Op.or]: [
          { representative_name: { [Op.iLike]: searchPattern } },
          { representative_phone: { [Op.iLike]: searchPattern } },
          { phone: { [Op.iLike]: searchPattern } },
          { email: { [Op.iLike]: searchPattern } },
        ],
      },
      include: [
        {
          model: CompanyDetail,
          as: "company_details",
          required: false,
        },
      ],
    });

    // Ищем в CompanyDetail
    const companyDetailResults = await CompanyDetail.findAll({
      where: {
        [Op.or]: [
          { full_name_org: { [Op.iLike]: searchPattern } },
          { short_name_org: { [Op.iLike]: searchPattern } },
          { inn: { [Op.iLike]: searchPattern.replace(/\D/g, "") } },
        ],
      },
      include: [
        {
          model: Counterparty,
          as: "counterparty",
        },
      ],
    });

    // Объединяем результаты
    const resultMap = new Map();

    counterpartyResults.forEach((c) => {
      resultMap.set(c.id, c.get({ plain: true }));
    });

    companyDetailResults.forEach((cd) => {
      if (cd.counterparty && !resultMap.has(cd.counterparty.id)) {
        const plain = cd.counterparty.get({ plain: true });
        plain.company_details = cd.get({ plain: true });
        resultMap.set(cd.counterparty.id, plain);
      }
    });

    return Array.from(resultMap.values());
  }
}

module.exports = CounterpartyService;
