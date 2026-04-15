const { Driver, User, Order } = require("../db/models");
const { Op } = require("sequelize");
const formatPhone = require("../utils/formatPhone");

class DriverService {
  // ============= ВАЛИДАЦИЯ =============

  static validatePhone(phone) {
    return formatPhone.validatePhone(phone);
  }

  static formatPhone(phone) {
    return formatPhone(phone);
  }

  static validateYear(year) {
    if (!year) return true; // необязательное поле
    const currentYear = new Date().getFullYear();
    return year >= 1900 && year <= currentYear + 1;
  }

  static validateDate(date) {
    if (!date) return true; // необязательное поле
    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
  }

  static validateDriverData(data) {
    const {
      full_name,
      phone,
      driver_type,
      vehicle_license_plate,
      vehicle_model,
      vehicle_year,
      inspection_date,
      next_inspection_date,
      permit_valid_from,
      permit_valid_until,
      insurance_valid_from,
      insurance_valid_until,
    } = data;

    if (
      !full_name ||
      typeof full_name !== "string" ||
      full_name.trim().length === 0
    ) {
      return {
        isValid: false,
        error: "ФИО водителя обязательно",
      };
    }

    if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
      return {
        isValid: false,
        error: "Телефон водителя обязателен",
      };
    }

    if (!this.validatePhone(phone)) {
      return {
        isValid: false,
        error: "Некорректный формат телефона",
      };
    }

    if (!driver_type || !["company", "external"].includes(driver_type)) {
      return {
        isValid: false,
        error: "Некорректный тип водителя",
      };
    }

    // Валидация для company водителей
    if (driver_type === "company") {
      if (vehicle_year && !this.validateYear(vehicle_year)) {
        return {
          isValid: false,
          error: "Некорректный год выпуска автомобиля",
        };
      }

      if (!this.validateDate(inspection_date)) {
        return {
          isValid: false,
          error: "Некорректная дата техосмотра",
        };
      }

      if (!this.validateDate(next_inspection_date)) {
        return {
          isValid: false,
          error: "Некорректная дата следующего техосмотра",
        };
      }

      if (!this.validateDate(permit_valid_from)) {
        return {
          isValid: false,
          error: "Некорректная дата начала действия пропуска",
        };
      }

      if (!this.validateDate(permit_valid_until)) {
        return {
          isValid: false,
          error: "Некорректная дата окончания действия пропуска",
        };
      }

      if (!this.validateDate(insurance_valid_from)) {
        return {
          isValid: false,
          error: "Некорректная дата начала действия страховки",
        };
      }

      if (!this.validateDate(insurance_valid_until)) {
        return {
          isValid: false,
          error: "Некорректная дата окончания действия страховки",
        };
      }

      // Проверка логики дат
      if (
        inspection_date &&
        next_inspection_date &&
        new Date(next_inspection_date) <= new Date(inspection_date)
      ) {
        return {
          isValid: false,
          error: "Дата следующего техосмотра должна быть позже даты текущего",
        };
      }

      if (
        permit_valid_from &&
        permit_valid_until &&
        new Date(permit_valid_until) <= new Date(permit_valid_from)
      ) {
        return {
          isValid: false,
          error: "Дата окончания пропуска должна быть позже даты начала",
        };
      }

      if (
        insurance_valid_from &&
        insurance_valid_until &&
        new Date(insurance_valid_until) <= new Date(insurance_valid_from)
      ) {
        return {
          isValid: false,
          error: "Дата окончания страховки должна быть позже даты начала",
        };
      }
    }

    return {
      isValid: true,
      error: null,
    };
  }

  // ============= ОСНОВНЫЕ МЕТОДЫ =============

  // * Получение всех водителей (с фильтрацией)
  static async getAll(filters = {}) {
    const where = {};

    if (filters.driver_type) {
      where.driver_type = filters.driver_type;
    }
    if (filters.is_active !== undefined) {
      where.is_active = filters.is_active;
    }
    if (filters.search) {
      where[Op.or] = [
        { full_name: { [Op.iLike]: `%${filters.search}%` } },
        { phone: { [Op.iLike]: `%${filters.search}%` } },
        { vehicle_license_plate: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    const drivers = await Driver.findAll({
      where,
      include: [
        {
          model: User,
          as: "user_info",
          attributes: ["id", "email", "full_name"],
          required: false,
        },
      ],
      order: [["full_name", "ASC"]],
    });

    return drivers.map((d) => d.get({ plain: true }));
  }

  // * Получение водителя по ID
  static async getById(id) {
    const driver = await Driver.findByPk(id, {
      include: [
        {
          model: User,
          as: "user_info",
          attributes: ["id", "email", "full_name", "role"],
        },
        {
          model: Order,
          as: "assigned_orders",
          attributes: [
            "id",
            "order_number",
            "status",
            "pickup_address",
            "created_at",
          ],
          limit: 10,
          order: [["created_at", "DESC"]],
          required: false,
        },
      ],
    });

    if (!driver) return null;
    return driver.get({ plain: true });
  }

  // * Создание нового водителя
  static async create(data) {
    // Валидация
    const validation = this.validateDriverData(data);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const {
      phone,
      user_id,
      full_name,
      driver_type,
      vehicle_license_plate,
      vehicle_model,
      vehicle_year,
      inspection_date,
      next_inspection_date,
      permit_valid_from,
      permit_valid_until,
      insurance_valid_from,
      insurance_valid_until,
    } = data;

    // Форматируем телефон
    const formattedPhone = this.formatPhone(phone);

    // Проверка на дубликат телефона
    const existing = await Driver.findOne({
      where: { phone: formattedPhone },
    });

    if (existing) {
      throw new Error("Водитель с таким телефоном уже существует");
    }

    // Если указан user_id, проверяем что пользователь существует
    if (user_id) {
      const user = await User.findByPk(user_id);
      if (!user) {
        throw new Error("Пользователь не найден");
      }
      if (user.role !== "driver") {
        throw new Error("Указанный пользователь не имеет роли водителя");
      }
    }

    const driver = await Driver.create({
      full_name: full_name.trim(),
      phone: formattedPhone,
      driver_type,
      user_id: user_id || null,
      vehicle_license_plate: vehicle_license_plate?.trim() || null,
      vehicle_model: vehicle_model?.trim() || null,
      vehicle_year: vehicle_year || null,
      inspection_date: inspection_date || null,
      next_inspection_date: next_inspection_date || null,
      permit_valid_from: permit_valid_from || null,
      permit_valid_until: permit_valid_until || null,
      insurance_valid_from: insurance_valid_from || null,
      insurance_valid_until: insurance_valid_until || null,
      inspection_notified: false,
      permit_notified: false,
      insurance_notified: false,
      is_active: true,
    });

    return this.getById(driver.id);
  }

  // * Обновление водителя
  static async update(id, data) {
    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new Error("Водитель не найден");
    }

    // Если обновляется телефон, проверяем уникальность
    if (data.phone && data.phone !== driver.phone) {
      const formattedPhone = this.formatPhone(data.phone);
      if (!formattedPhone) {
        throw new Error("Некорректный формат телефона");
      }

      const existing = await Driver.findOne({
        where: { phone: formattedPhone },
      });

      if (existing && existing.id !== id) {
        throw new Error("Водитель с таким телефоном уже существует");
      }

      data.phone = formattedPhone;
    }

    // Если обновляется user_id, проверяем существование пользователя
    if (data.user_id && data.user_id !== driver.user_id) {
      const user = await User.findByPk(data.user_id);
      if (!user) {
        throw new Error("Пользователь не найден");
      }
      if (user.role !== "driver") {
        throw new Error("Указанный пользователь не имеет роли водителя");
      }
    }

    // Валидация для company водителей
    const newDriverType = data.driver_type || driver.driver_type;
    if (newDriverType === "company") {
      if (data.vehicle_year && !this.validateYear(data.vehicle_year)) {
        throw new Error("Некорректный год выпуска автомобиля");
      }

      // Проверка логики дат если обновляются обе
      if (data.inspection_date && data.next_inspection_date) {
        if (
          new Date(data.next_inspection_date) <= new Date(data.inspection_date)
        ) {
          throw new Error(
            "Дата следующего техосмотра должна быть позже даты текущего",
          );
        }
      }

      if (data.permit_valid_from && data.permit_valid_until) {
        if (
          new Date(data.permit_valid_until) <= new Date(data.permit_valid_from)
        ) {
          throw new Error(
            "Дата окончания пропуска должна быть позже даты начала",
          );
        }
      }

      if (data.insurance_valid_from && data.insurance_valid_until) {
        if (
          new Date(data.insurance_valid_until) <=
          new Date(data.insurance_valid_from)
        ) {
          throw new Error(
            "Дата окончания страховки должна быть позже даты начала",
          );
        }
      }
    }

    await driver.update(data);
    return this.getById(driver.id);
  }

  // * Деактивация водителя (мягкое удаление)
  static async deactivate(id) {
    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new Error("Водитель не найден");
    }

    await driver.update({ is_active: false });
    return { id, is_active: false };
  }

  // * Активация водителя
  static async activate(id) {
    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new Error("Водитель не найден");
    }

    await driver.update({ is_active: true });
    return { id, is_active: true };
  }

  // * Полное удаление (только для админа)
  static async delete(id) {
    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new Error("Водитель не найден");
    }

    await driver.destroy();
    return id;
  }

  // * Поиск по госномеру
  static async searchByLicensePlate(licensePlate) {
    const drivers = await Driver.findAll({
      where: {
        vehicle_license_plate: {
          [Op.iLike]: `%${licensePlate}%`,
        },
      },
      include: [
        {
          model: User,
          as: "user_info",
          attributes: ["id", "email", "full_name"],
        },
      ],
    });

    return drivers.map((d) => d.get({ plain: true }));
  }

  // * Получение водителей с истекающими документами
  static async getExpiringDocuments(daysThreshold = 30) {
    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const drivers = await Driver.findAll({
      where: {
        driver_type: "company",
        is_active: true,
        [Op.or]: [
          {
            next_inspection_date: {
              [Op.between]: [today, thresholdDate],
            },
          },
          {
            permit_valid_until: {
              [Op.between]: [today, thresholdDate],
            },
          },
          {
            insurance_valid_until: {
              [Op.between]: [today, thresholdDate],
            },
          },
        ],
      },
    });

    return drivers.map((d) => d.get({ plain: true }));
  }

  // * Получение водителей по типу
  static async getByType(driverType) {
    const drivers = await Driver.findAll({
      where: {
        driver_type: driverType,
        is_active: true,
      },
    });

    return drivers.map((d) => d.get({ plain: true }));
  }

  // * Получение водителей без назначенных заказов
  static async getAvailableDrivers() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const drivers = await Driver.findAll({
      where: {
        is_active: true,
      },
      include: [
        {
          model: Order,
          as: "assigned_orders",
          where: {
            status: { [Op.in]: ["assigned", "in_transit"] },
            created_at: { [Op.gte]: today },
          },
          required: false,
        },
      ],
    });

    // Фильтруем водителей без активных заказов
    return drivers
      .filter((d) => !d.assigned_orders || d.assigned_orders.length === 0)
      .map((d) => d.get({ plain: true }));
  }

  // * Статистика по водителям
  static async getStats() {
    const total = await Driver.count();
    const active = await Driver.count({ where: { is_active: true } });
    const company = await Driver.count({
      where: { driver_type: "company", is_active: true },
    });
    const external = await Driver.count({
      where: { driver_type: "external", is_active: true },
    });

    const withUser = await Driver.count({
      where: { user_id: { [Op.not]: null } },
    });
    const withoutUser = await Driver.count({ where: { user_id: null } });

    const expiringSoon = await this.getExpiringDocuments(30).then(
      (d) => d.length,
    );

    return {
      total,
      active,
      inactive: total - active,
      by_type: {
        company,
        external,
      },
      users: {
        with_account: withUser,
        without_account: withoutUser,
      },
      documents: {
        expiring_soon: expiringSoon,
      },
    };
  }

  // * Отметка об отправке уведомления
  static async markNotified(id, type) {
    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new Error("Водитель не найден");
    }

    const updateData = { last_notification_date: new Date() };

    if (type === "inspection") {
      updateData.inspection_notified = true;
    } else if (type === "permit") {
      updateData.permit_notified = true;
    } else if (type === "insurance") {
      updateData.insurance_notified = true;
    }

    await driver.update(updateData);
    return this.getById(driver.id);
  }
}

module.exports = DriverService;
