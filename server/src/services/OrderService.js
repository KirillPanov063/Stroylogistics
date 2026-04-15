const {
  Order,
  User,
  Counterparty,
  Driver,
  sequelize,
} = require("../db/models");
const { Op } = require("sequelize");

class OrderService {
  // ============= ВАЛИДАЦИЯ =============

  static validateOrderData(data) {
    const {
      customer_id,
      pickup_address,
      customer_phone,
      contact_phone,
      payment_type,
      client_amount,
      executor_amount,
      commission_amount,
      payment_format,
      prepaid_deliveries_total,
      driver_id,
      executor_id,
    } = data;

    if (!customer_id) {
      return {
        isValid: false,
        error: "ID клиента обязателен",
      };
    }

    if (
      !pickup_address ||
      typeof pickup_address !== "string" ||
      pickup_address.trim().length === 0
    ) {
      return {
        isValid: false,
        error: "Адрес забора/доставки обязателен",
      };
    }

    if (
      !customer_phone ||
      typeof customer_phone !== "string" ||
      customer_phone.trim().length === 0
    ) {
      return {
        isValid: false,
        error: "Телефон клиента обязателен",
      };
    }

    if (
      !contact_phone ||
      typeof contact_phone !== "string" ||
      contact_phone.trim().length === 0
    ) {
      return {
        isValid: false,
        error: "Контактный телефон обязателен",
      };
    }

    // Валидация: должен быть указан либо водитель, либо исполнитель
    const hasDriver = driver_id !== null && driver_id !== undefined;
    const hasExecutor = executor_id !== null && executor_id !== undefined;

    if (!hasDriver && !hasExecutor) {
      return {
        isValid: false,
        error: "Должен быть указан либо водитель, либо исполнитель",
      };
    }

    if (hasDriver && hasExecutor) {
      return {
        isValid: false,
        error: "Нельзя указать одновременно и водителя, и исполнителя",
      };
    }

    // Валидация для водителя компании
    if (hasDriver) {
      if (
        executor_amount !== null &&
        executor_amount !== undefined &&
        executor_amount !== 0
      ) {
        return {
          isValid: false,
          error:
            "Для заказа с водителем компании сумма исполнителю должна быть 0 или null",
        };
      }
      if (
        commission_amount !== null &&
        commission_amount !== undefined &&
        commission_amount !== 0
      ) {
        return {
          isValid: false,
          error:
            "Для заказа с водителем компании комиссия должна быть 0 или null",
        };
      }
    }

    // Валидация для внешнего исполнителя
    if (hasExecutor) {
      if (!client_amount || client_amount <= 0) {
        return {
          isValid: false,
          error: "Для внешнего исполнителя необходимо указать сумму от клиента",
        };
      }
      if (!executor_amount || executor_amount <= 0) {
        return {
          isValid: false,
          error:
            "Для внешнего исполнителя необходимо указать сумму исполнителю",
        };
      }
      if (commission_amount === null || commission_amount === undefined) {
        return {
          isValid: false,
          error: "Для внешнего исполнителя необходимо указать сумму комиссии",
        };
      }
      if (client_amount !== executor_amount + commission_amount) {
        return {
          isValid: false,
          error:
            "Сумма от клиента должна равняться сумме исполнителю плюс комиссия",
        };
      }
    }

    // Валидация payment_type
    if (
      !payment_type ||
      ![
        "invoice_with_vat",
        "invoice_without_vat",
        "card_transfer",
        "cash",
      ].includes(payment_type)
    ) {
      return {
        isValid: false,
        error:
          "Некорректный тип оплаты. Допустимые значения: invoice_with_vat, invoice_without_vat, card_transfer, cash",
      };
    }

    // Валидация для предоплаченного пакета
    if (payment_format === "prepaid") {
      if (!prepaid_deliveries_total || prepaid_deliveries_total <= 0) {
        return {
          isValid: false,
          error: "Для предоплаты необходимо указать количество доставок",
        };
      }
    }

    return {
      isValid: true,
      error: null,
    };
  }

  // ============= ОСНОВНЫЕ МЕТОДЫ =============

  static async getAll(filters = {}) {
    const where = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.customer_id) {
      where.customer_id = filters.customer_id;
    }
    if (filters.driver_id) {
      where.driver_id = filters.driver_id;
    }
    if (filters.executor_id) {
      where.executor_id = filters.executor_id;
    }
    if (filters.user_id) {
      where.user_id = filters.user_id;
    }
    if (filters.payment_format) {
      where.payment_format = filters.payment_format;
    }
    if (filters.payment_type) {
      where.payment_type = filters.payment_type;
    }
    if (filters.date_from || filters.date_to) {
      where.created_at = {};
      if (filters.date_from) {
        where.created_at[Op.gte] = new Date(filters.date_from);
      }
      if (filters.date_to) {
        where.created_at[Op.lte] = new Date(filters.date_to);
      }
    }

    const orders = await Order.findAll({
      where,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "full_name", "email"],
        },
        {
          model: Counterparty,
          as: "customer",
          attributes: ["id", "representative_name", "person_type", "phone"],
        },
        {
          model: Counterparty,
          as: "executor",
          attributes: ["id", "representative_name", "person_type", "phone"],
          required: false,
        },
        {
          model: Driver,
          as: "driver",
          attributes: ["id", "full_name", "phone", "driver_type"],
          required: false,
        },
        {
          model: Order,
          as: "related_order",
          attributes: ["id", "order_number", "status", "pickup_address"],
          required: false,
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return orders.map((o) => o.get({ plain: true }));
  }

  static async getById(id) {
    const order = await Order.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "full_name", "email"],
        },
        {
          model: Counterparty,
          as: "customer",
          include: [
            {
              model: require("../db/models").CompanyDetail,
              as: "company_details",
              required: false,
            },
          ],
        },
        {
          model: Counterparty,
          as: "executor",
          include: [
            {
              model: require("../db/models").CompanyDetail,
              as: "company_details",
              required: false,
            },
          ],
          required: false,
        },
        {
          model: Driver,
          as: "driver",
          attributes: ["id", "full_name", "phone", "driver_type"],
          required: false,
        },
        {
          model: Order,
          as: "related_order",
          include: [
            {
              model: Counterparty,
              as: "customer",
              attributes: ["representative_name"],
            },
          ],
        },
        {
          model: Order,
          as: "child_orders",
          attributes: ["id", "order_number", "status", "pickup_address"],
          required: false,
        },
      ],
    });

    if (!order) return null;
    return order.get({ plain: true });
  }

  static async create(data, userId) {
    const validation = this.validateOrderData(data);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const {
      customer_id,
      driver_id,
      executor_id,
      related_order_id,
      container_number,
      container_action,
      container_volume,
      installed_container_number,
      picked_up_container_number,
      install_date,
      install_duration,
      pickup_reminder_date,
      loading_time,
      pickup_address,
      customer_phone,
      contact_phone,
      payment_type,
      client_amount,
      executor_amount,
      commission_amount,
      payment_format,
      prepaid_deliveries_total,
      payment_confirmation_file,
      completion_photo,
      comments,
      status = "draft",
    } = data;

    const customer = await Counterparty.findByPk(customer_id);
    if (!customer) {
      throw new Error("Клиент не найден");
    }

    if (executor_id) {
      const executor = await Counterparty.findByPk(executor_id);
      if (!executor) {
        throw new Error("Исполнитель не найден");
      }
      if (!["executor", "both"].includes(executor.counterparty_type)) {
        throw new Error("Указанный контрагент не может быть исполнителем");
      }
    }

    if (driver_id) {
      const driver = await Driver.findByPk(driver_id);
      if (!driver) {
        throw new Error("Водитель не найден");
      }
    }

    if (related_order_id) {
      const relatedOrder = await Order.findByPk(related_order_id);
      if (!relatedOrder) {
        throw new Error("Связанный заказ не найден");
      }
    }

    const orderData = {
      user_id: userId,
      customer_id,
      driver_id: driver_id || null,
      executor_id: executor_id || null,
      related_order_id,
      status,
      container_number,
      container_action,
      container_volume,
      installed_container_number,
      picked_up_container_number,
      install_date,
      install_duration,
      pickup_reminder_date,
      loading_time,
      pickup_address: pickup_address.trim(),
      customer_phone,
      contact_phone,
      payment_type,
      payment_format,
      prepaid_deliveries_total:
        payment_format === "prepaid" ? prepaid_deliveries_total : null,
      prepaid_deliveries_used: payment_format === "prepaid" ? 0 : null,
      payment_confirmation_file,
      completion_photo,
      comments: comments?.trim(),
      last_delivery_notified: false,
    };

    if (executor_id) {
      orderData.client_amount = client_amount;
      orderData.executor_amount = executor_amount;
      orderData.commission_amount = commission_amount;
      orderData.payment_amount = client_amount;
    } else {
      orderData.client_amount =
        client_amount !== undefined && client_amount !== null
          ? client_amount
          : 0;
      orderData.executor_amount = 0;
      orderData.commission_amount = 0;
      orderData.payment_amount = orderData.client_amount;
    }

    const order = await Order.create(orderData);
    return this.getById(order.id);
  }

  static async update(id, data, userId) {
    // ============= ОТЛАДКА =============
    console.log("\n=== UPDATE CALLED ===");
    console.log("data:", JSON.stringify(data));
    console.log("order.id:", id);
    // ============= КОНЕЦ ОТЛАДКИ =============

    const order = await Order.findByPk(id);
    if (!order) {
      throw new Error("Заказ не найден");
    }

    // ============= ПРОДОЛЖЕНИЕ ОТЛАДКИ =============
    console.log("order.executor_amount:", order.executor_amount);
    console.log("order.commission_amount:", order.commission_amount);
    console.log("order.driver_id:", order.driver_id);
    console.log("order.executor_id:", order.executor_id);
    console.log("order.client_amount:", order.client_amount);
    // ============= КОНЕЦ ОТЛАДКИ =============

    // Нельзя изменить user_id (кто создал)
    delete data.user_id;

    // ============= ПРОВЕРКА СМЕНЫ ТИПА ИСПОЛНИТЕЛЯ =============
    const newHasDriver =
      data.driver_id !== undefined
        ? data.driver_id !== null
        : order.driver_id !== null;
    const newHasExecutor =
      data.executor_id !== undefined
        ? data.executor_id !== null
        : order.executor_id !== null;

    if (newHasDriver && newHasExecutor) {
      throw new Error("Нельзя указать одновременно и водителя, и исполнителя");
    }
    if (!newHasDriver && !newHasExecutor) {
      throw new Error("Должен быть указан либо водитель, либо исполнитель");
    }

    // Если меняем водителя на исполнителя
    if (newHasExecutor && !order.executor_id) {
      if (data.client_amount === undefined || data.client_amount <= 0) {
        throw new Error(
          "Для назначения исполнителя необходимо указать сумму от клиента",
        );
      }
      if (data.executor_amount === undefined || data.executor_amount <= 0) {
        throw new Error(
          "Для назначения исполнителя необходимо указать сумму исполнителю",
        );
      }
      if (data.commission_amount === undefined) {
        throw new Error(
          "Для назначения исполнителя необходимо указать сумму комиссии",
        );
      }
      if (
        data.client_amount !==
        data.executor_amount + data.commission_amount
      ) {
        throw new Error(
          "Сумма от клиента должна равняться сумме исполнителю плюс комиссия",
        );
      }
      data.driver_id = null;
    }

    // Если меняем исполнителя на водителя
    if (newHasDriver && !order.driver_id) {
      data.client_amount =
        data.client_amount !== undefined ? data.client_amount : 0;
      data.executor_amount = 0;
      data.commission_amount = 0;
      data.payment_amount = data.client_amount;
      data.executor_id = null;
    }

    // ============= ПРОВЕРКА СТАТУСА =============
    if (data.status) {
      const validTransitions = {
        draft: ["processing", "cancelled"],
        processing: ["assigned", "cancelled"],
        assigned: ["in_transit", "cancelled"],
        in_transit: ["paid", "completed", "cancelled"],
        paid: ["completed"],
        completed: [],
        cancelled: [],
      };

      if (!validTransitions[order.status]?.includes(data.status)) {
        throw new Error(
          `Невозможно изменить статус с ${order.status} на ${data.status}`,
        );
      }
    }

    // ============= ПРОВЕРКА СУЩЕСТВОВАНИЯ ВОДИТЕЛЯ =============
    if (data.driver_id && data.driver_id !== order.driver_id) {
      const driver = await Driver.findByPk(data.driver_id);
      if (!driver) {
        throw new Error("Водитель не найден");
      }
    }

    // ============= ПРОВЕРКА СУЩЕСТВОВАНИЯ ИСПОЛНИТЕЛЯ =============
    if (data.executor_id && data.executor_id !== order.executor_id) {
      const executor = await Counterparty.findByPk(data.executor_id);
      if (!executor) {
        throw new Error("Исполнитель не найден");
      }
      if (!["executor", "both"].includes(executor.counterparty_type)) {
        throw new Error("Указанный контрагент не может быть исполнителем");
      }
    }

    // ============= ПРОВЕРКА ТИПА ОПЛАТЫ =============
    if (data.payment_type) {
      const validPaymentTypes = [
        "invoice_with_vat",
        "invoice_without_vat",
        "card_transfer",
        "cash",
      ];
      if (!validPaymentTypes.includes(data.payment_type)) {
        throw new Error("Некорректный тип оплаты");
      }
    }

    // ============= ПРОВЕРКА КОМИССИОННЫХ ПОЛЕЙ =============
    // Если обновляется только статус и нет изменений в комиссионных полях
    const onlyStatusUpdate =
      Object.keys(data).length === 1 &&
      data.status !== undefined &&
      data.client_amount === undefined &&
      data.executor_amount === undefined &&
      data.commission_amount === undefined;

    console.log("onlyStatusUpdate:", onlyStatusUpdate);
    console.log("Object.keys(data):", Object.keys(data));

    if (onlyStatusUpdate) {
      console.log(
        "=== ПРОПУСК ПРОВЕРКИ КОМИССИОННЫХ ПОЛЕЙ (onlyStatusUpdate == true) ===",
      );
      // Устанавливаем флаг для пропуска валидации в модели
      order._skipStatusValidation = true;
    } else {
      const isExecutorOrder =
        (data.executor_id !== undefined && data.executor_id !== null) ||
        (order.executor_id !== null && data.executor_id !== null);

      console.log("isExecutorOrder:", isExecutorOrder);

      if (isExecutorOrder) {
        const newClientAmount =
          data.client_amount !== undefined
            ? data.client_amount
            : order.client_amount;
        const newExecutorAmount =
          data.executor_amount !== undefined
            ? data.executor_amount
            : order.executor_amount;
        const newCommissionAmount =
          data.commission_amount !== undefined
            ? data.commission_amount
            : order.commission_amount;

        const client = newClientAmount || 0;
        const executor = newExecutorAmount || 0;
        const commission = newCommissionAmount || 0;

        console.log("Арифметика:", { client, executor, commission });

        if (client !== executor + commission) {
          throw new Error(
            "Сумма от клиента должна равняться сумме исполнителю плюс комиссия",
          );
        }
      } else {
        // Заказ с водителем - комиссионные поля должны быть 0
        console.log("=== БЛОК ДЛЯ ВОДИТЕЛЯ ===");
        console.log("data.client_amount:", data.client_amount);
        console.log("data.executor_amount:", data.executor_amount);
        console.log("data.commission_amount:", data.commission_amount);
        console.log("order.client_amount:", order.client_amount);
        console.log("order.executor_amount:", order.executor_amount);
        console.log("order.commission_amount:", order.commission_amount);

        // Сначала приводим к 0, если не переданы
        if (data.client_amount === undefined || data.client_amount === null) {
          data.client_amount = order.client_amount || 0;
          console.log("client_amount приведен к:", data.client_amount);
        }
        if (
          data.executor_amount === undefined ||
          data.executor_amount === null
        ) {
          data.executor_amount = 0;
          console.log("executor_amount приведен к:", data.executor_amount);
        }
        if (
          data.commission_amount === undefined ||
          data.commission_amount === null
        ) {
          data.commission_amount = 0;
          console.log("commission_amount приведен к:", data.commission_amount);
        }

        console.log("После приведения:");
        console.log("data.executor_amount:", data.executor_amount);
        console.log("data.commission_amount:", data.commission_amount);

        // Теперь проверяем (после приведения)
        if (data.executor_amount !== 0) {
          console.log(
            "ОШИБКА: executor_amount !== 0, значение:",
            data.executor_amount,
          );
          throw new Error(
            "Для заказа с водителем компании сумма исполнителю должна быть 0",
          );
        }
        if (data.commission_amount !== 0) {
          console.log(
            "ОШИБКА: commission_amount !== 0, значение:",
            data.commission_amount,
          );
          throw new Error(
            "Для заказа с водителем компании комиссия должна быть 0",
          );
        }
      }
    }

    await order.update(data);
    return this.getById(order.id);
  }

  static async updateStatus(id, status, userId) {
    return this.update(id, { status }, userId);
  }

  static async assignDriver(id, driverId, userId) {
    return this.update(id, { driver_id: driverId }, userId);
  }

  static async assignExecutor(
    id,
    executorId,
    clientAmount,
    executorAmount,
    commissionAmount,
    userId,
  ) {
    return this.update(
      id,
      {
        executor_id: executorId,
        client_amount: clientAmount,
        executor_amount: executorAmount,
        commission_amount: commissionAmount,
        payment_amount: clientAmount,
        driver_id: null,
      },
      userId,
    );
  }

  static async addCompletionPhoto(id, photoPath, userId) {
    const order = await Order.findByPk(id);
    if (!order) {
      throw new Error("Заказ не найден");
    }

    if (!order.driver_id && !order.executor_id) {
      throw new Error("Должен быть указан либо водитель, либо исполнитель");
    }

    const newStatus =
      order.status === "in_transit" ? "completed" : order.status;

    await Order.update(
      {
        completion_photo: photoPath,
        status: newStatus,
      },
      {
        where: { id },
        hooks: false,
      },
    );

    return this.getById(order.id);
  }

  static async addPaymentConfirmation(id, filePath, userId) {
    const order = await Order.findByPk(id);
    if (!order) {
      throw new Error("Заказ не найден");
    }

    await Order.update(
      { payment_confirmation_file: filePath },
      {
        where: { id },
        hooks: false,
      },
    );

    return this.getById(order.id);
  }

  static async usePrepaidDelivery(id) {
    const order = await Order.findByPk(id);
    if (!order) {
      throw new Error("Заказ не найден");
    }

    if (order.payment_format !== "prepaid") {
      throw new Error("Это не предоплаченный заказ");
    }

    const used = (order.prepaid_deliveries_used || 0) + 1;
    const total = order.prepaid_deliveries_total;

    if (used > total) {
      throw new Error("Все предоплаченные доставки уже использованы");
    }

    await Order.update(
      {
        prepaid_deliveries_used: used,
        last_delivery_notified:
          used === total - 1 ? false : order.last_delivery_notified,
      },
      {
        where: { id },
        hooks: false,
      },
    );

    return this.getById(order.id);
  }

  static async markLastDeliveryNotified(id) {
    const order = await Order.findByPk(id);
    if (!order) {
      throw new Error("Заказ не найден");
    }

    await Order.update(
      { last_delivery_notified: true },
      {
        where: { id },
        hooks: false,
      },
    );

    return this.getById(order.id);
  }

  static async getByCustomer(customerId, includeCompleted = false) {
    const where = { customer_id: customerId };

    if (!includeCompleted) {
      where.status = { [Op.notIn]: ["completed", "cancelled"] };
    }

    const orders = await Order.findAll({
      where,
      include: [
        {
          model: Driver,
          as: "driver",
          attributes: ["id", "full_name", "phone"],
          required: false,
        },
        {
          model: Counterparty,
          as: "executor",
          attributes: ["id", "representative_name"],
          required: false,
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return orders.map((o) => o.get({ plain: true }));
  }

  static async getByDriver(driverId, includeCompleted = false) {
    const where = { driver_id: driverId };

    if (!includeCompleted) {
      where.status = { [Op.notIn]: ["completed", "cancelled"] };
    }

    const orders = await Order.findAll({
      where,
      include: [
        {
          model: Counterparty,
          as: "customer",
          attributes: ["id", "representative_name", "phone"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return orders.map((o) => o.get({ plain: true }));
  }

  static async getByExecutor(executorId, includeCompleted = false) {
    const where = { executor_id: executorId };

    if (!includeCompleted) {
      where.status = { [Op.notIn]: ["completed", "cancelled"] };
    }

    const orders = await Order.findAll({
      where,
      include: [
        {
          model: Counterparty,
          as: "customer",
          attributes: ["id", "representative_name", "phone"],
        },
      ],
      order: [["created_at", "DESC"]],
    });

    return orders.map((o) => o.get({ plain: true }));
  }

  static async searchByNumber(orderNumber) {
    const orders = await Order.findAll({
      where: {
        order_number: {
          [Op.eq]: orderNumber,
        },
      },
      include: [
        {
          model: Counterparty,
          as: "customer",
        },
        {
          model: Counterparty,
          as: "executor",
          required: false,
        },
        {
          model: Driver,
          as: "driver",
          required: false,
        },
      ],
    });

    return orders.map((o) => o.get({ plain: true }));
  }

  static async searchByAddress(address) {
    const orders = await Order.findAll({
      where: {
        pickup_address: {
          [Op.iLike]: `%${address}%`,
        },
      },
      include: [
        {
          model: Counterparty,
          as: "customer",
        },
        {
          model: Counterparty,
          as: "executor",
          required: false,
        },
        {
          model: Driver,
          as: "driver",
          required: false,
        },
      ],
      limit: 20,
    });

    return orders.map((o) => o.get({ plain: true }));
  }

  static async getOrdersForReminders() {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const pickupReminders = await Order.findAll({
      where: {
        pickup_reminder_date: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay,
        },
        status: {
          [Op.notIn]: ["completed", "cancelled"],
        },
      },
      include: [
        {
          model: Counterparty,
          as: "customer",
        },
      ],
    });

    return pickupReminders.map((o) => o.get({ plain: true }));
  }

  static async getStats(filters = {}) {
    const where = {};

    if (filters.date_from || filters.date_to) {
      where.created_at = {};
      if (filters.date_from) {
        where.created_at[Op.gte] = new Date(filters.date_from);
      }
      if (filters.date_to) {
        where.created_at[Op.lte] = new Date(filters.date_to);
      }
    }

    const total = await Order.count({ where });

    const byStatus = {};
    const statuses = [
      "draft",
      "processing",
      "assigned",
      "in_transit",
      "paid",
      "completed",
      "cancelled",
    ];

    for (const status of statuses) {
      byStatus[status] = await Order.count({
        where: { ...where, status },
      });
    }

    const driverOrders = await Order.count({
      where: { ...where, driver_id: { [Op.not]: null } },
    });
    const executorOrders = await Order.count({
      where: { ...where, executor_id: { [Op.not]: null } },
    });

    const totalClientAmount = await Order.sum("client_amount", { where });
    const totalExecutorAmount = await Order.sum("executor_amount", { where });
    const totalCommission = await Order.sum("commission_amount", { where });
    const totalPaymentAmount = await Order.sum("payment_amount", { where });

    const byPaymentType = {
      invoice_with_vat: await Order.count({
        where: { ...where, payment_type: "invoice_with_vat" },
      }),
      invoice_without_vat: await Order.count({
        where: { ...where, payment_type: "invoice_without_vat" },
      }),
      card_transfer: await Order.count({
        where: { ...where, payment_type: "card_transfer" },
      }),
      cash: await Order.count({
        where: { ...where, payment_type: "cash" },
      }),
    };

    const prepaidStats = {
      total: await Order.count({
        where: { ...where, payment_format: "prepaid" },
      }),
      active: await Order.count({
        where: {
          ...where,
          payment_format: "prepaid",
          prepaid_deliveries_used: {
            [Op.lt]: sequelize.col("prepaid_deliveries_total"),
          },
        },
      }),
    };

    return {
      total,
      by_status: byStatus,
      by_type: {
        driver_orders: driverOrders,
        executor_orders: executorOrders,
      },
      financial: {
        total_client_amount: totalClientAmount || 0,
        total_executor_amount: totalExecutorAmount || 0,
        total_commission: totalCommission || 0,
        total_payment_amount: totalPaymentAmount || 0,
      },
      by_payment_type: byPaymentType,
      prepaid: prepaidStats,
    };
  }

  static async getOrderChain(orderId) {
    const order = await Order.findByPk(orderId);
    if (!order) {
      throw new Error("Заказ не найден");
    }

    const chain = [];
    let currentOrder = order;

    while (currentOrder) {
      chain.unshift(currentOrder.get({ plain: true }));
      if (currentOrder.related_order_id) {
        currentOrder = await Order.findByPk(currentOrder.related_order_id);
      } else {
        currentOrder = null;
      }
    }

    const childOrders = await Order.findAll({
      where: { related_order_id: order.id },
    });

    for (const child of childOrders) {
      chain.push(child.get({ plain: true }));
    }

    return chain;
  }

  static async delete(id) {
    const order = await Order.findByPk(id);
    if (!order) {
      throw new Error("Заказ не найден");
    }

    await order.destroy();
    return id;
  }
}

module.exports = OrderService;
