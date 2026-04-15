const {
  sequelize,
  Order,
  User,
  Counterparty,
  Driver,
} = require("./src/db/models");
const { Op } = require("sequelize");

// Цвета для консоли
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function logSuccess(msg) {
  console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function logError(msg) {
  console.log(`${colors.red}❌ ${msg}${colors.reset}`);
}

function logInfo(msg) {
  console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`);
}

function logStep(msg) {
  console.log(`\n${colors.yellow}📌 ${msg}${colors.reset}`);
}

function logData(label, data) {
  console.log(`${colors.cyan}${label}:${colors.reset}`);
  console.log(JSON.stringify(data, null, 2));
}

async function testOrders() {
  logStep("ПОЛНОЕ ТЕСТИРОВАНИЕ ЗАКАЗОВ (ORDERS)");

  try {
    // 1. Общая статистика
    logInfo("📊 Общая статистика заказов:");
    const totalOrders = await Order.count();
    logSuccess(`Всего заказов в БД: ${totalOrders}`);

    // 2. Статистика по статусам
    logInfo("📈 Статистика по статусам:");
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
      const count = await Order.count({ where: { status } });
      if (count > 0) {
        console.log(`   ${status}: ${count}`);
      }
    }

    // 3. Проверка автоинкремента order_number
    logInfo("🔢 Проверка номеров заказов (order_number):");
    const orders = await Order.findAll({
      attributes: ["id", "order_number", "status", "payment_type"],
      order: [["order_number", "ASC"]],
      limit: 10,
    });

    orders.forEach((order) => {
      console.log(
        `   Заказ #${order.order_number} - ${order.status} - ${order.payment_type}`,
      );
    });

    // 4. Заказы по типам клиентов
    logInfo("🏢 Заказы по типам клиентов:");

    const llcOrders = await Order.count({
      include: [
        {
          model: Counterparty,
          as: "customer",
          where: { person_type: "llc" },
        },
      ],
    });
    console.log(`   ООО: ${llcOrders} заказов`);

    const ipOrders = await Order.count({
      include: [
        {
          model: Counterparty,
          as: "customer",
          where: { person_type: "entrepreneur" },
        },
      ],
    });
    console.log(`   ИП: ${ipOrders} заказов`);

    const individualOrders = await Order.count({
      include: [
        {
          model: Counterparty,
          as: "customer",
          where: { person_type: "individual" },
        },
      ],
    });
    console.log(`   Физлица: ${individualOrders} заказов`);

    // 5. Статистика по типам оплаты
    logInfo("💳 Статистика по типам оплаты:");
    const paymentTypes = [
      "invoice_with_vat",
      "invoice_without_vat",
      "card_transfer",
      "cash",
    ];

    for (const type of paymentTypes) {
      const count = await Order.count({ where: { payment_type: type } });
      if (count > 0) {
        console.log(`   ${type}: ${count}`);
      }
    }

    // 6. Заказы по типу исполнителя (водитель / исполнитель)
    logInfo("🚛 Заказы по типу исполнителя:");
    const withDriver = await Order.count({
      where: { driver_id: { [Op.not]: null } },
    });
    const withExecutor = await Order.count({
      where: { executor_id: { [Op.not]: null } },
    });
    console.log(`   С водителем: ${withDriver}`);
    console.log(`   С исполнителем: ${withExecutor}`);

    // 7. Статистика по комиссионным полям
    logInfo("💰 Статистика по комиссионным полям:");

    const ordersWithCommission = await Order.findAll({
      where: {
        executor_id: { [Op.not]: null },
        client_amount: { [Op.not]: null },
        executor_amount: { [Op.not]: null },
        commission_amount: { [Op.not]: null },
      },
      attributes: [
        "order_number",
        "client_amount",
        "executor_amount",
        "commission_amount",
      ],
    });

    if (ordersWithCommission.length > 0) {
      console.log(`   Заказов с комиссией: ${ordersWithCommission.length}`);
      ordersWithCommission.forEach((order) => {
        console.log(
          `   Заказ #${order.order_number}: клиент=${order.client_amount}, исполнитель=${order.executor_amount}, комиссия=${order.commission_amount}`,
        );
      });
    } else {
      console.log("   Заказов с комиссией нет");
    }

    // 8. Финансовая статистика
    logInfo("📊 Финансовая статистика:");
    const totalClientAmount = await Order.sum("client_amount");
    const totalExecutorAmount = await Order.sum("executor_amount");
    const totalCommission = await Order.sum("commission_amount");
    const totalPaymentAmount = await Order.sum("payment_amount");

    console.log(`   Общая сумма от клиентов: ${totalClientAmount || 0} руб.`);
    console.log(
      `   Общая сумма исполнителям: ${totalExecutorAmount || 0} руб.`,
    );
    console.log(`   Общая комиссия: ${totalCommission || 0} руб.`);
    console.log(
      `   Общая сумма оплаты (обратная совместимость): ${totalPaymentAmount || 0} руб.`,
    );

    // 9. Заказы по действиям с контейнерами
    logInfo("📦 Заказы по действиям с контейнерами:");
    const containerActions = ["install", "pickup", "loading"];

    for (const action of containerActions) {
      const count = await Order.count({ where: { container_action: action } });
      if (count > 0) {
        console.log(`   ${action}: ${count}`);
      }
    }

    // 10. Заказы по объемам контейнеров
    logInfo("📏 Заказы по объемам контейнеров:");
    const volumes = ["8m3", "20m3", "27m3"];

    for (const volume of volumes) {
      const count = await Order.count({ where: { container_volume: volume } });
      if (count > 0) {
        console.log(`   ${volume}: ${count}`);
      }
    }

    // 11. Детальная информация по заказам
    logStep("📋 Детальная информация по заказам");

    const sampleOrders = await Order.findAll({
      limit: 5,
      include: [
        {
          model: Counterparty,
          as: "customer",
          attributes: ["representative_name", "person_type", "phone"],
        },
        {
          model: Counterparty,
          as: "executor",
          attributes: ["representative_name", "person_type"],
          required: false,
        },
        {
          model: Driver,
          as: "driver",
          attributes: ["full_name", "phone", "driver_type"],
          required: false,
        },
        {
          model: User,
          as: "creator",
          attributes: ["full_name", "email"],
        },
      ],
    });

    for (const order of sampleOrders) {
      console.log(
        `\n${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
      );
      console.log(`Заказ #${order.order_number} (${order.status})`);
      console.log(`📋 Адрес: ${order.pickup_address}`);

      if (order.executor_id) {
        console.log(
          `💰 Сумма от клиента: ${order.client_amount} руб. (${order.payment_type})`,
        );
        console.log(`   Исполнителю: ${order.executor_amount} руб.`);
        console.log(`   Комиссия: ${order.commission_amount} руб.`);
      } else {
        console.log(
          `💰 Сумма: ${order.payment_amount} руб. (${order.payment_type})`,
        );
      }

      if (order.payment_format === "prepaid") {
        console.log(
          `   Предоплаченный пакет: ${order.prepaid_deliveries_total} доставок, использовано ${order.prepaid_deliveries_used}`,
        );
      }

      if (order.customer) {
        console.log(
          `👤 Клиент: ${order.customer.representative_name} (${order.customer.person_type}) - ${order.customer.phone}`,
        );
      }

      if (order.executor) {
        console.log(
          `👤 Исполнитель: ${order.executor.representative_name} (${order.executor.person_type})`,
        );
      }

      if (order.driver) {
        console.log(
          `🚚 Водитель: ${order.driver.full_name} (${order.driver.driver_type}) - ${order.driver.phone}`,
        );
      } else {
        console.log(`🚚 Водитель: не назначен`);
      }

      if (order.container_number) {
        console.log(
          `📦 Контейнер: ${order.container_number} (${order.container_action || "действие не указано"}, ${order.container_volume || "объем не указан"})`,
        );
      }

      if (order.install_date) {
        console.log(
          `📅 Дата установки: ${new Date(order.install_date).toLocaleDateString()}`,
        );
      }

      if (order.pickup_reminder_date) {
        console.log(
          `⏰ Напоминание о заборе: ${new Date(order.pickup_reminder_date).toLocaleDateString()}`,
        );
      }

      if (order.payment_confirmation_file) {
        console.log(
          `📎 Подтверждение оплаты: ${order.payment_confirmation_file}`,
        );
      }

      if (order.completion_photo) {
        console.log(`📸 Фото выполнения: ${order.completion_photo}`);
      }

      if (order.comments) {
        console.log(`💬 Комментарий: ${order.comments}`);
      }
    }

    // 12. Проверка связанных заказов
    logStep("🔗 Проверка связанных заказов");

    const relatedExists = await Order.findOne({
      where: { related_order_id: { [Op.not]: null } },
    });

    if (relatedExists) {
      logSuccess("Есть заказы со связями");

      const relatedOrders = await Order.findAll({
        where: { related_order_id: { [Op.not]: null } },
        include: [
          {
            model: Order,
            as: "related_order",
            attributes: [
              "order_number",
              "status",
              "pickup_address",
              "container_action",
            ],
          },
        ],
      });

      for (const order of relatedOrders) {
        console.log(
          `\n📌 Заказ #${order.order_number} (${order.container_action}) связан с заказом #${order.related_order?.order_number} (${order.related_order?.container_action})`,
        );
        console.log(`   Адрес: ${order.pickup_address}`);
      }
    } else {
      logInfo("Нет связанных заказов");
    }

    // 13. Проверка предоплаченных заказов
    logStep("💰 Предоплаченные заказы");

    const prepaidOrders = await Order.findAll({
      where: {
        payment_format: "prepaid",
        prepaid_deliveries_total: { [Op.not]: null },
      },
      attributes: [
        "order_number",
        "prepaid_deliveries_total",
        "prepaid_deliveries_used",
        "last_delivery_notified",
      ],
    });

    if (prepaidOrders.length > 0) {
      prepaidOrders.forEach((order) => {
        const remaining =
          order.prepaid_deliveries_total - order.prepaid_deliveries_used;
        console.log(
          `Заказ #${order.order_number}: всего ${order.prepaid_deliveries_total}, использовано ${order.prepaid_deliveries_used}, осталось ${remaining} ${order.last_delivery_notified ? "(уведомление отправлено)" : ""}`,
        );
      });
    } else {
      logInfo("Нет предоплаченных заказов");
    }

    // 14. Проверка завершенных заказов с фото
    logStep("📸 Завершенные заказы с фото");

    const completedWithPhoto = await Order.count({
      where: {
        status: "completed",
        completion_photo: { [Op.not]: null },
      },
    });

    logSuccess(`Завершенных заказов с фото: ${completedWithPhoto}`);

    // 15. Проверка заказов с подтверждением оплаты
    logStep("📎 Заказы с подтверждением оплаты");

    const withPaymentConfirm = await Order.count({
      where: {
        payment_confirmation_file: { [Op.not]: null },
      },
    });

    logSuccess(`Заказов с подтверждением оплаты: ${withPaymentConfirm}`);

    // 16. Статистика по датам
    logStep("📅 Статистика по датам");

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const ordersThisMonth = await Order.count({
      where: {
        created_at: {
          [Op.gte]: startOfMonth,
          [Op.lte]: endOfMonth,
        },
      },
    });

    console.log(`   Заказов в этом месяце: ${ordersThisMonth}`);

    // 17. Поиск заказов по адресу
    logStep("🔍 Поиск заказов по адресу");

    const searchResults = await Order.findAll({
      where: {
        pickup_address: {
          [Op.iLike]: "%Москва%",
        },
      },
      limit: 3,
      attributes: ["order_number", "pickup_address", "status"],
    });

    if (searchResults.length > 0) {
      console.log("   Найденные заказы по адресу (Москва):");
      searchResults.forEach((order) => {
        console.log(
          `   Заказ #${order.order_number}: ${order.pickup_address} (${order.status})`,
        );
      });
    }

    // Итог
    logStep("📊 ИТОГОВАЯ СТАТИСТИКА");

    const summary = {
      total_orders: totalOrders,
      by_status: {},
      by_payment_type: {},
      by_container_action: {},
      with_driver: withDriver,
      with_executor: withExecutor,
      prepaid_orders: prepaidOrders.length,
      with_completion_photo: completedWithPhoto,
      with_payment_confirmation: withPaymentConfirm,
      financial: {
        total_client_amount: totalClientAmount || 0,
        total_executor_amount: totalExecutorAmount || 0,
        total_commission: totalCommission || 0,
      },
    };

    for (const status of statuses) {
      summary.by_status[status] = await Order.count({ where: { status } });
    }

    for (const type of paymentTypes) {
      summary.by_payment_type[type] = await Order.count({
        where: { payment_type: type },
      });
    }

    for (const action of containerActions) {
      summary.by_container_action[action] = await Order.count({
        where: { container_action: action },
      });
    }

    logData("📈 Итоговая статистика", summary);
  } catch (error) {
    logError(`Ошибка при проверке: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Запуск теста
testOrders();
