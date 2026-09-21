const {
  Order,
  User,
  Counterparty,
  Driver,
  sequelize,
} = require("../db/models");
const { Op } = require("sequelize");
const PriceService = require("./PriceService");
const SalaryService = require("./SalaryService");

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

    // executor_collects требует исполнителя
    if (data.payment_flow === "executor_collects" && !hasExecutor) {
      return {
        isValid: false,
        error: "Схема 'исполнитель собирает' доступна только при назначении исполнителя",
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

    if (filters.status) where.status = filters.status;
    if (filters.customer_id) where.customer_id = filters.customer_id;
    if (filters.driver_id) where.driver_id = filters.driver_id;
    if (filters.executor_id) where.executor_id = filters.executor_id;
    if (filters.user_id) where.user_id = filters.user_id;
    if (filters.payment_format) where.payment_format = filters.payment_format;
    if (filters.payment_type) where.payment_type = filters.payment_type;

    if (filters.date_from || filters.date_to) {
      where.created_at = {};
      if (filters.date_from) {
        where.created_at[Op.gte] = new Date(filters.date_from);
      }
      if (filters.date_to) {
        where.created_at[Op.lte] = new Date(filters.date_to);
      }
    }

    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 50));
    const offset = (page - 1) * limit;

    const { count, rows } = await Order.findAndCountAll({
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
      limit,
      offset,
    });

    return {
      data: rows.map((o) => o.get({ plain: true })),
      pagination: {
        total: count,
        page,
        limit,
        total_pages: Math.ceil(count / limit),
      },
    };
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
    // Автоподстановка client_amount из прайс-карточки клиента, если не указана
    if (
      data.executor_id &&
      !data.client_amount &&
      data.container_volume &&
      data.payment_type &&
      data.customer_id
    ) {
      try {
        const priceInfo = await PriceService.getPriceForCustomer(
          data.customer_id,
          data.container_volume,
          data.payment_type,
        );
        data = { ...data, client_amount: priceInfo.price };
      } catch {
        // У клиента нет настроенных цен — продолжаем без автоподстановки
      }
    }

    // Автовычисление commission_amount = client_amount - executor_amount
    if (
      data.executor_id &&
      data.client_amount > 0 &&
      data.executor_amount > 0 &&
      data.commission_amount == null
    ) {
      data = {
        ...data,
        commission_amount:
          parseFloat(data.client_amount) - parseFloat(data.executor_amount),
      };
    }

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
      executor_payment_method,
      income_recipient_user_id,
      is_loss_acknowledged,
      payment_format,
      prepaid_deliveries_total,
      payment_confirmation_file,
      completion_photo,
      comments,
      status = "draft",
      distance_multiplier,
      payment_flow = "direct",
    } = data;

    // Коэффициент дальности — только для штатных водителей, должен быть > 0
    if (distance_multiplier !== undefined && distance_multiplier !== null) {
      if (executor_id) {
        throw new Error("Коэффициент дальности применяется только для штатных водителей");
      }
      const m = parseFloat(distance_multiplier);
      if (isNaN(m) || m <= 0) {
        throw new Error("Коэффициент дальности должен быть положительным числом");
      }
    }

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
      distance_multiplier: driver_id && distance_multiplier != null
        ? parseFloat(distance_multiplier)
        : 1.0,
      payment_flow: executor_id ? payment_flow : "direct",
    };

    if (executor_id) {
      orderData.client_amount = client_amount;
      orderData.executor_amount = executor_amount;
      orderData.commission_amount = commission_amount;
      orderData.payment_amount = client_amount;
      orderData.executor_payment_method = executor_payment_method || null;
    } else {
      orderData.client_amount =
        client_amount !== undefined && client_amount !== null
          ? client_amount
          : 0;
      orderData.executor_amount = 0;
      orderData.commission_amount = 0;
      orderData.payment_amount = orderData.client_amount;
      orderData.executor_payment_method = null;
    }

    // Расчёт нетто-сумм после НДС
    orderData.client_amount_net = SalaryService.calcNet(
      orderData.client_amount,
      payment_type,
    );
    orderData.executor_amount_net = SalaryService.calcNet(
      orderData.executor_amount,
      orderData.executor_payment_method,
    );

    // Проверка прибыльности (сценарии 4 и 5)
    if (executor_id && executor_payment_method) {
      const profitCheck = SalaryService.checkProfitability({
        payment_type,
        client_amount: orderData.client_amount,
        executor_payment_method,
        executor_amount: orderData.executor_amount,
      });

      if (profitCheck.isLoss && !is_loss_acknowledged) {
        const err = new Error(profitCheck.warning);
        err.type = "LOSS_WARNING";
        err.details = profitCheck;
        throw err;
      }
      orderData.is_loss_acknowledged = profitCheck.isLoss ? true : false;
    }

    // Получатель наличных/карты (для зарплаты)
    if (["cash", "card_transfer"].includes(payment_type)) {
      orderData.income_recipient_user_id = income_recipient_user_id || null;
    }

    const order = await Order.create(orderData);
    return this.getById(order.id);
  }

  static async update(id, data, userId) {
    const order = await Order.findByPk(id);
    if (!order) {
      throw new Error("Заказ не найден");
    }

    delete data.user_id;

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

    // Смена водителя на исполнителя
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
      if (data.client_amount !== data.executor_amount + data.commission_amount) {
        throw new Error(
          "Сумма от клиента должна равняться сумме исполнителю плюс комиссия",
        );
      }
      data.driver_id = null;
    }

    // Смена исполнителя на водителя
    if (newHasDriver && !order.driver_id) {
      data.client_amount =
        data.client_amount !== undefined ? data.client_amount : 0;
      data.executor_amount = 0;
      data.commission_amount = 0;
      data.payment_amount = data.client_amount;
      data.executor_id = null;
    }

    if (data.status) {
      const validTransitions = {
        draft: ["processing", "cancelled"],
        processing: ["assigned", "cancelled"],
        assigned: ["in_transit", "cancelled"],
        in_transit: ["driver_done", "paid", "cancelled"],
        driver_done: ["paid", "cancelled"],
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

    if (data.driver_id && data.driver_id !== order.driver_id) {
      const driver = await Driver.findByPk(data.driver_id);
      if (!driver) {
        throw new Error("Водитель не найден");
      }
    }

    if (data.executor_id && data.executor_id !== order.executor_id) {
      const executor = await Counterparty.findByPk(data.executor_id);
      if (!executor) {
        throw new Error("Исполнитель не найден");
      }
      if (!["executor", "both"].includes(executor.counterparty_type)) {
        throw new Error("Указанный контрагент не может быть исполнителем");
      }
    }

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

    if (data.distance_multiplier !== undefined && data.distance_multiplier !== null) {
      if (newHasExecutor) {
        throw new Error("Коэффициент дальности применяется только для штатных водителей");
      }
      const m = parseFloat(data.distance_multiplier);
      if (isNaN(m) || m <= 0) {
        throw new Error("Коэффициент дальности должен быть положительным числом");
      }
      data.distance_multiplier = m;
    }

    const onlyStatusUpdate =
      Object.keys(data).length === 1 && data.status !== undefined;

    if (!onlyStatusUpdate) {
      const isExecutorOrder =
        (data.executor_id !== undefined && data.executor_id !== null) ||
        (order.executor_id !== null && data.executor_id !== null);

      if (isExecutorOrder) {
        const client =
          data.client_amount !== undefined
            ? data.client_amount
            : Number(order.client_amount) || 0;
        const executor =
          data.executor_amount !== undefined
            ? data.executor_amount
            : Number(order.executor_amount) || 0;

        // Автовычисление комиссии если изменились суммы, но комиссия не передана
        if (
          data.commission_amount === undefined &&
          (data.client_amount !== undefined || data.executor_amount !== undefined)
        ) {
          data.commission_amount = parseFloat(client) - parseFloat(executor);
        }

        const commission =
          data.commission_amount !== undefined
            ? data.commission_amount
            : Number(order.commission_amount) || 0;

        if (client !== executor + commission) {
          throw new Error(
            "Сумма от клиента должна равняться сумме исполнителю плюс комиссия",
          );
        }
      } else {
        if (data.client_amount === undefined || data.client_amount === null) {
          data.client_amount = order.client_amount || 0;
        }
        data.executor_amount = 0;
        data.commission_amount = 0;
      }
    }

    // Пересчёт нетто-сумм при изменении финансовых полей или типов оплаты
    const effectivePaymentType = data.payment_type || order.payment_type;
    const effectiveExecutorMethod =
      data.executor_payment_method !== undefined
        ? data.executor_payment_method
        : order.executor_payment_method;
    const effectiveClientAmount =
      data.client_amount !== undefined
        ? data.client_amount
        : Number(order.client_amount);
    const effectiveExecutorAmount =
      data.executor_amount !== undefined
        ? data.executor_amount
        : Number(order.executor_amount);

    if (
      data.payment_type !== undefined ||
      data.executor_payment_method !== undefined ||
      data.client_amount !== undefined ||
      data.executor_amount !== undefined
    ) {
      data.client_amount_net = SalaryService.calcNet(
        effectiveClientAmount,
        effectivePaymentType,
      );
      data.executor_amount_net = SalaryService.calcNet(
        effectiveExecutorAmount,
        effectiveExecutorMethod,
      );

      // Проверка прибыльности (сценарии 4 и 5)
      if (newHasExecutor && effectiveExecutorMethod) {
        const profitCheck = SalaryService.checkProfitability({
          payment_type: effectivePaymentType,
          client_amount: effectiveClientAmount,
          executor_payment_method: effectiveExecutorMethod,
          executor_amount: effectiveExecutorAmount,
        });

        if (profitCheck.isLoss && !data.is_loss_acknowledged) {
          const err = new Error(profitCheck.warning);
          err.type = "LOSS_WARNING";
          err.details = profitCheck;
          throw err;
        }
        data.is_loss_acknowledged = profitCheck.isLoss ? true : false;
      }
    }

    // Обновляем получателя наличных/карты если изменился тип оплаты
    if (data.income_recipient_user_id !== undefined) {
      if (!["cash", "card_transfer"].includes(effectivePaymentType)) {
        data.income_recipient_user_id = null;
      }
    }

    if (data.status === "driver_done" && !data.driver_completed_at) {
      data.driver_completed_at = new Date();
    }

    await order.update(data);

    // Начисление зарплаты при завершении заказа (сценарии 2 и 3)
    if (data.status === "completed") {
      await SalaryService.accrueForOrder(id, userId);
    }

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

    // Один запрос для агрегатов и финансовых итогов
    const [aggregates, byStatusRows, byPaymentTypeRows] = await Promise.all([
      Order.findOne({
        where,
        attributes: [
          [sequelize.fn("COUNT", sequelize.col("id")), "total"],
          [sequelize.fn("SUM", sequelize.col("client_amount")), "total_client_amount"],
          [sequelize.fn("SUM", sequelize.col("executor_amount")), "total_executor_amount"],
          [sequelize.fn("SUM", sequelize.col("commission_amount")), "total_commission"],
          [sequelize.fn("SUM", sequelize.col("payment_amount")), "total_payment_amount"],
          [
            sequelize.fn("COUNT", sequelize.literal("CASE WHEN driver_id IS NOT NULL THEN 1 END")),
            "driver_orders",
          ],
          [
            sequelize.fn("COUNT", sequelize.literal("CASE WHEN executor_id IS NOT NULL THEN 1 END")),
            "executor_orders",
          ],
          [
            sequelize.fn("COUNT", sequelize.literal("CASE WHEN payment_format = 'prepaid' THEN 1 END")),
            "prepaid_total",
          ],
          [
            sequelize.fn(
              "COUNT",
              sequelize.literal(
                "CASE WHEN payment_format = 'prepaid' AND prepaid_deliveries_used < prepaid_deliveries_total THEN 1 END",
              ),
            ),
            "prepaid_active",
          ],
        ],
        raw: true,
      }),

      Order.findAll({
        where,
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        group: ["status"],
        raw: true,
      }),

      Order.findAll({
        where,
        attributes: [
          "payment_type",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        group: ["payment_type"],
        raw: true,
      }),
    ]);

    const byStatus = {
      draft: 0, processing: 0, assigned: 0,
      in_transit: 0, paid: 0, completed: 0, cancelled: 0,
    };
    for (const row of byStatusRows) {
      byStatus[row.status] = Number(row.count);
    }

    const byPaymentType = {
      invoice_with_vat: 0, invoice_without_vat: 0,
      card_transfer: 0, cash: 0,
    };
    for (const row of byPaymentTypeRows) {
      byPaymentType[row.payment_type] = Number(row.count);
    }

    return {
      total: Number(aggregates.total) || 0,
      by_status: byStatus,
      by_type: {
        driver_orders: Number(aggregates.driver_orders) || 0,
        executor_orders: Number(aggregates.executor_orders) || 0,
      },
      financial: {
        total_client_amount: Number(aggregates.total_client_amount) || 0,
        total_executor_amount: Number(aggregates.total_executor_amount) || 0,
        total_commission: Number(aggregates.total_commission) || 0,
        total_payment_amount: Number(aggregates.total_payment_amount) || 0,
      },
      by_payment_type: byPaymentType,
      prepaid: {
        total: Number(aggregates.prepaid_total) || 0,
        active: Number(aggregates.prepaid_active) || 0,
      },
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
