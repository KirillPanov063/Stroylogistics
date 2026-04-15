const {
  sequelize,
  Order,
  User,
  Counterparty,
  Driver,
} = require("./src/db/models");
const OrderService = require("./src/services/OrderService");
const CounterpartyService = require("./src/services/CounterpartyService");
const { Op } = require("sequelize");

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

let testIds = {
  userId: null,
  customerId: null,
  driverId: null,
  executorId: null,
  orderId: null,
  relatedOrderId: null,
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

async function setupTestData() {
  logStep("Подготовка тестовых данных");

  try {
    const user = await User.create({
      email: `test_manager_${Date.now()}@example.com`,
      phone: `+7927${Date.now().toString().slice(-7)}`,
      password_hash: "hashed_password",
      full_name: "Тестовый Менеджер",
      role: "manager",
      is_active: true,
    });
    testIds.userId = user.id;
    logSuccess(`Создан пользователь ID: ${testIds.userId}`);

    const customer = await Counterparty.create({
      counterparty_type: "client",
      person_type: "llc",
      representative_name: "Тестовый Клиент ООО",
      representative_phone: `+7926${Date.now().toString().slice(-7)}`,
      email: `test_client_${Date.now()}@example.com`,
      phone: "+74951234567",
      is_active: true,
    });
    testIds.customerId = customer.id;
    logSuccess(`Создан клиент ID: ${testIds.customerId}`);

    const driver = await Driver.create({
      full_name: "Тестовый Водитель",
      phone: `+7925${Date.now().toString().slice(-7)}`,
      driver_type: "company",
      is_active: true,
    });
    testIds.driverId = driver.id;
    logSuccess(`Создан водитель ID: ${testIds.driverId}`);

    const executor = await Counterparty.create({
      counterparty_type: "executor",
      person_type: "individual",
      representative_name: "Тестовый Исполнитель",
      representative_phone: `+7924${Date.now().toString().slice(-7)}`,
      email: `test_executor_${Date.now()}@example.com`,
      is_active: true,
    });
    testIds.executorId = executor.id;
    logSuccess(`Создан исполнитель ID: ${testIds.executorId}`);
  } catch (error) {
    logError(`Ошибка подготовки данных: ${error.message}`);
    throw error;
  }
}

async function testValidateOrderData() {
  logStep("1. ТЕСТ: validateOrderData");

  try {
    logInfo("1.1 Валидация заказа с водителем");
    const validDriverData = {
      customer_id: testIds.customerId,
      pickup_address: "г. Москва, ул. Тестовая, д. 1",
      customer_phone: "+74951234567",
      contact_phone: "+79261234567",
      payment_type: "cash",
      driver_id: testIds.driverId,
      client_amount: 10000,
    };
    const result1 = OrderService.validateOrderData(validDriverData);
    if (result1.isValid) {
      logSuccess("Валидация заказа с водителем прошла");
    } else {
      logError(`Ошибка: ${result1.error}`);
    }

    logInfo("1.2 Валидация заказа с исполнителем");
    const validExecutorData = {
      customer_id: testIds.customerId,
      pickup_address: "г. Москва, ул. Тестовая, д. 1",
      customer_phone: "+74951234567",
      contact_phone: "+79261234567",
      payment_type: "cash",
      executor_id: testIds.executorId,
      client_amount: 10000,
      executor_amount: 7000,
      commission_amount: 3000,
    };
    const result2 = OrderService.validateOrderData(validExecutorData);
    if (result2.isValid) {
      logSuccess("Валидация заказа с исполнителем прошла");
    } else {
      logError(`Ошибка: ${result2.error}`);
    }

    logInfo("1.3 Ошибка: нет ни водителя, ни исполнителя");
    const noExecutorData = {
      customer_id: testIds.customerId,
      pickup_address: "г. Москва, ул. Тестовая, д. 1",
      customer_phone: "+74951234567",
      contact_phone: "+79261234567",
      payment_type: "cash",
    };
    const result3 = OrderService.validateOrderData(noExecutorData);
    if (!result3.isValid && result3.error.includes("Должен быть указан")) {
      logSuccess("Ошибка корректна");
    } else {
      logError(
        "Ожидалась ошибка о необходимости указать водителя или исполнителя",
      );
    }

    logInfo("1.4 Ошибка: и водитель, и исполнитель");
    const bothData = {
      customer_id: testIds.customerId,
      pickup_address: "г. Москва, ул. Тестовая, д. 1",
      customer_phone: "+74951234567",
      contact_phone: "+79261234567",
      payment_type: "cash",
      driver_id: testIds.driverId,
      executor_id: testIds.executorId,
    };
    const result4 = OrderService.validateOrderData(bothData);
    if (
      !result4.isValid &&
      result4.error.includes("Нельзя указать одновременно")
    ) {
      logSuccess("Ошибка корректна");
    } else {
      logError(
        "Ожидалась ошибка о невозможности указать и водителя, и исполнителя",
      );
    }

    logInfo("1.5 Ошибка: для исполнителя не указаны суммы");
    const noAmountsData = {
      customer_id: testIds.customerId,
      pickup_address: "г. Москва, ул. Тестовая, д. 1",
      customer_phone: "+74951234567",
      contact_phone: "+79261234567",
      payment_type: "cash",
      executor_id: testIds.executorId,
    };
    const result5 = OrderService.validateOrderData(noAmountsData);
    if (!result5.isValid) {
      logSuccess("Ошибка корректна");
    } else {
      logError("Ожидалась ошибка о необходимости указать суммы");
    }

    logInfo("1.6 Ошибка: арифметика не сходится");
    const wrongAmountsData = {
      customer_id: testIds.customerId,
      pickup_address: "г. Москва, ул. Тестовая, д. 1",
      customer_phone: "+74951234567",
      contact_phone: "+79261234567",
      payment_type: "cash",
      executor_id: testIds.executorId,
      client_amount: 10000,
      executor_amount: 8000,
      commission_amount: 1000,
    };
    const result6 = OrderService.validateOrderData(wrongAmountsData);
    if (
      !result6.isValid &&
      result6.error.includes("должна равняться сумме исполнителю плюс комиссия")
    ) {
      logSuccess("Ошибка корректна");
    } else {
      logError("Ожидалась ошибка о несоответствии сумм");
    }
  } catch (error) {
    logError(`Ошибка в тесте validateOrderData: ${error.message}`);
    throw error;
  }
}

async function testCreateOrder() {
  logStep("2. ТЕСТ: create");

  try {
    logInfo("2.1 Создание заказа с водителем");
    const driverOrderData = {
      customer_id: testIds.customerId,
      driver_id: testIds.driverId,
      pickup_address: "г. Москва, ул. Доставки, д. 10",
      customer_phone: "+74951112233",
      contact_phone: "+79261112233",
      payment_type: "invoice_with_vat",
      client_amount: 25000,
      executor_amount: 0,
      commission_amount: 0,
      payment_format: "single",
      container_number: "TEST-001",
      container_action: "install",
      container_volume: "20m3",
      install_duration: "1 день",
      comments: "Тестовый заказ с водителем",
    };

    const driverOrder = await OrderService.create(
      driverOrderData,
      testIds.userId,
    );
    testIds.orderId = driverOrder.id;
    logSuccess(`Заказ с водителем создан, ID: ${testIds.orderId}`);
    logData("Данные заказа", {
      order_number: driverOrder.order_number,
      status: driverOrder.status,
      client_amount: driverOrder.client_amount,
      executor_amount: driverOrder.executor_amount,
      commission_amount: driverOrder.commission_amount,
      driver_id: driverOrder.driver_id,
      executor_id: driverOrder.executor_id,
    });

    logInfo("2.2 Создание заказа с исполнителем");
    const executorOrderData = {
      customer_id: testIds.customerId,
      executor_id: testIds.executorId,
      pickup_address: "г. Москва, ул. Забора, д. 20",
      customer_phone: "+74951112233",
      contact_phone: "+79261112233",
      payment_type: "cash",
      client_amount: 15000,
      executor_amount: 10000,
      commission_amount: 5000,
      payment_format: "single",
      container_number: "TEST-002",
      container_action: "pickup",
      container_volume: "8m3",
      comments: "Тестовый заказ с исполнителем",
      related_order_id: testIds.orderId,
    };

    const executorOrder = await OrderService.create(
      executorOrderData,
      testIds.userId,
    );
    testIds.relatedOrderId = executorOrder.id;
    logSuccess(`Заказ с исполнителем создан, ID: ${testIds.relatedOrderId}`);
    logData("Данные заказа", {
      order_number: executorOrder.order_number,
      status: executorOrder.status,
      client_amount: executorOrder.client_amount,
      executor_amount: executorOrder.executor_amount,
      commission_amount: executorOrder.commission_amount,
      driver_id: executorOrder.driver_id,
      executor_id: executorOrder.executor_id,
    });

    const client = parseFloat(executorOrder.client_amount);
    const executor = parseFloat(executorOrder.executor_amount);
    const commission = parseFloat(executorOrder.commission_amount);

    if (Math.abs(client - (executor + commission)) < 0.01) {
      logSuccess("Арифметика верна");
    } else {
      logError(`Арифметика неверна: ${client} !== ${executor} + ${commission}`);
    }
  } catch (error) {
    logError(`Ошибка в тесте create: ${error.message}`);
    throw error;
  }
}

async function testGetById() {
  logStep("3. ТЕСТ: getById");

  try {
    const order = await OrderService.getById(testIds.orderId);

    if (order && order.id === testIds.orderId) {
      logSuccess(`Заказ найден, номер: ${order.order_number}`);
      logData("Детали заказа", {
        status: order.status,
        address: order.pickup_address,
        driver: order.driver?.full_name,
        executor: order.executor?.representative_name,
        client_amount: order.client_amount,
      });
    } else {
      logError("Заказ не найден");
    }
  } catch (error) {
    logError(`Ошибка в тесте getById: ${error.message}`);
    throw error;
  }
}

async function testGetAll() {
  logStep("4. ТЕСТ: getAll");

  try {
    const filters = {};
    const orders = await OrderService.getAll(filters);

    logSuccess(`Найдено заказов: ${orders.length}`);

    const draftOrders = await OrderService.getAll({ status: "draft" });
    logSuccess(`Заказов со статусом draft: ${draftOrders.length}`);

    const customerOrders = await OrderService.getAll({
      customer_id: testIds.customerId,
    });
    logSuccess(`Заказов клиента: ${customerOrders.length}`);
  } catch (error) {
    logError(`Ошибка в тесте getAll: ${error.message}`);
    throw error;
  }
}

async function testUpdateOrder() {
  logStep("5. ТЕСТ: update");

  try {
    logInfo("5.1 Обновление статуса заказа");
    const updated = await OrderService.update(
      testIds.orderId,
      { status: "processing" },
      testIds.userId,
    );
    if (updated.status === "processing") {
      logSuccess("Статус обновлен");
    } else {
      logError("Статус не обновился");
    }

    logInfo("5.2 Попытка неверного перехода статуса");
    try {
      await OrderService.update(
        testIds.orderId,
        { status: "completed" },
        testIds.userId,
      );
      logError("Удалось неверное изменение статуса (ОШИБКА)");
    } catch (error) {
      if (error.message.includes("Невозможно изменить статус")) {
        logSuccess("Неверный переход статуса заблокирован");
      } else {
        throw error;
      }
    }

    logInfo("5.3 Обновление комментария");
    const newComment = "Обновленный комментарий";
    const updatedComment = await OrderService.update(
      testIds.orderId,
      { comments: newComment },
      testIds.userId,
    );
    if (updatedComment.comments === newComment) {
      logSuccess("Комментарий обновлен");
    } else {
      logError("Комментарий не обновился");
    }
  } catch (error) {
    logError(`Ошибка в тесте update: ${error.message}`);
    throw error;
  }
}

async function testUpdateStatus() {
  logStep("6. ТЕСТ: updateStatus");

  try {
    const updated = await OrderService.updateStatus(
      testIds.orderId,
      "assigned",
      testIds.userId,
    );
    if (updated.status === "assigned") {
      logSuccess("Статус обновлен через updateStatus");
    } else {
      logError("Статус не обновился");
    }
  } catch (error) {
    logError(`Ошибка в тесте updateStatus: ${error.message}`);
    throw error;
  }
}

async function testAssignDriver() {
  logStep("7. ТЕСТ: assignDriver");

  try {
    const newDriver = await Driver.create({
      full_name: "Новый Водитель",
      phone: `+7923${Date.now().toString().slice(-7)}`,
      driver_type: "company",
      is_active: true,
    });

    const updated = await OrderService.assignDriver(
      testIds.orderId,
      newDriver.id,
      testIds.userId,
    );
    if (updated.driver_id === newDriver.id) {
      logSuccess("Водитель назначен");
    } else {
      logError("Водитель не назначен");
    }

    await OrderService.assignDriver(
      testIds.orderId,
      testIds.driverId,
      testIds.userId,
    );
    await newDriver.destroy();
  } catch (error) {
    logError(`Ошибка в тесте assignDriver: ${error.message}`);
    throw error;
  }
}

async function testAssignExecutor() {
  logStep("8. ТЕСТ: assignExecutor");

  try {
    const newExecutor = await Counterparty.create({
      counterparty_type: "executor",
      person_type: "individual",
      representative_name: "Новый Исполнитель",
      representative_phone: `+7922${Date.now().toString().slice(-7)}`,
      email: `new_executor_${Date.now()}@example.com`,
      is_active: true,
    });

    const updated = await OrderService.assignExecutor(
      testIds.relatedOrderId,
      newExecutor.id,
      20000,
      14000,
      6000,
      testIds.userId,
    );

    if (updated.executor_id === newExecutor.id) {
      logSuccess("Исполнитель назначен");
      const client = parseFloat(updated.client_amount);
      const executor = parseFloat(updated.executor_amount);
      const commission = parseFloat(updated.commission_amount);
      if (Math.abs(client - (executor + commission)) < 0.01) {
        logSuccess("Суммы установлены корректно");
      } else {
        logError(`Суммы неверны: ${client} !== ${executor} + ${commission}`);
      }
    } else {
      logError("Исполнитель не назначен");
    }

    await OrderService.assignExecutor(
      testIds.relatedOrderId,
      testIds.executorId,
      15000,
      10000,
      5000,
      testIds.userId,
    );
    await newExecutor.destroy();
  } catch (error) {
    logError(`Ошибка в тесте assignExecutor: ${error.message}`);
    throw error;
  }
}

async function testAddCompletionPhoto() {
  logStep("9. ТЕСТ: addCompletionPhoto");

  try {
    const photoPath = "/uploads/test/completion_photo.jpg";

    const order = await OrderService.getById(testIds.orderId);
    if (!order) {
      throw new Error("Заказ не найден");
    }

    logInfo(
      `Заказ #${order.order_number}: driver_id=${order.driver_id}, executor_id=${order.executor_id}, status=${order.status}`,
    );

    const updated = await OrderService.addCompletionPhoto(
      testIds.orderId,
      photoPath,
      testIds.userId,
    );

    if (updated.completion_photo === photoPath) {
      logSuccess("Фото добавлено");
    } else {
      logError("Фото не добавлено");
    }
  } catch (error) {
    logError(`Ошибка в тесте addCompletionPhoto: ${error.message}`);
    throw error;
  }
}

async function testAddPaymentConfirmation() {
  logStep("10. ТЕСТ: addPaymentConfirmation");

  try {
    const filePath = "/uploads/test/payment_confirmation.pdf";
    const updated = await OrderService.addPaymentConfirmation(
      testIds.orderId,
      filePath,
      testIds.userId,
    );

    if (updated.payment_confirmation_file === filePath) {
      logSuccess("Подтверждение оплаты добавлено");
    } else {
      logError("Подтверждение оплаты не добавлено");
    }
  } catch (error) {
    logError(`Ошибка в тесте addPaymentConfirmation: ${error.message}`);
    throw error;
  }
}

async function testGetByCustomer() {
  logStep("11. ТЕСТ: getByCustomer");

  try {
    const orders = await OrderService.getByCustomer(testIds.customerId);
    logSuccess(`Найдено заказов клиента: ${orders.length}`);

    const allOrders = await OrderService.getByCustomer(
      testIds.customerId,
      true,
    );
    logSuccess(
      `Всего заказов клиента (включая завершенные): ${allOrders.length}`,
    );
  } catch (error) {
    logError(`Ошибка в тесте getByCustomer: ${error.message}`);
    throw error;
  }
}

async function testGetByDriver() {
  logStep("12. ТЕСТ: getByDriver");

  try {
    const orders = await OrderService.getByDriver(testIds.driverId);
    logSuccess(`Найдено заказов водителя: ${orders.length}`);
  } catch (error) {
    logError(`Ошибка в тесте getByDriver: ${error.message}`);
    throw error;
  }
}

async function testGetByExecutor() {
  logStep("13. ТЕСТ: getByExecutor");

  try {
    const orders = await OrderService.getByExecutor(testIds.executorId);
    logSuccess(`Найдено заказов исполнителя: ${orders.length}`);
  } catch (error) {
    logError(`Ошибка в тесте getByExecutor: ${error.message}`);
    throw error;
  }
}

async function testSearchByNumber() {
  logStep("14. ТЕСТ: searchByNumber");

  try {
    const order = await OrderService.getById(testIds.orderId);
    const found = await OrderService.searchByNumber(order.order_number);

    if (found.length > 0) {
      logSuccess(`Заказ #${order.order_number} найден`);
    } else {
      logError("Заказ не найден");
    }
  } catch (error) {
    logError(`Ошибка в тесте searchByNumber: ${error.message}`);
    throw error;
  }
}

async function testSearchByAddress() {
  logStep("15. ТЕСТ: searchByAddress");

  try {
    const orders = await OrderService.searchByAddress("Москва");
    logSuccess(`Найдено заказов по адресу: ${orders.length}`);
  } catch (error) {
    logError(`Ошибка в тесте searchByAddress: ${error.message}`);
    throw error;
  }
}

async function testGetOrderChain() {
  logStep("16. ТЕСТ: getOrderChain");

  try {
    const chain = await OrderService.getOrderChain(testIds.orderId);
    logSuccess(`Цепочка заказов содержит ${chain.length} элементов`);

    if (chain.length >= 2) {
      logSuccess("Связь между заказами работает");
    }
  } catch (error) {
    logError(`Ошибка в тесте getOrderChain: ${error.message}`);
    throw error;
  }
}

async function testGetStats() {
  logStep("17. ТЕСТ: getStats");

  try {
    const stats = await OrderService.getStats();

    logData("Статистика заказов", {
      total: stats.total,
      by_status: stats.by_status,
      by_type: stats.by_type,
      financial: stats.financial,
      by_payment_type: stats.by_payment_type,
    });

    logSuccess("Статистика получена");
  } catch (error) {
    logError(`Ошибка в тесте getStats: ${error.message}`);
    throw error;
  }
}

async function testUsePrepaidDelivery() {
  logStep("18. ТЕСТ: usePrepaidDelivery");

  try {
    const prepaidOrderData = {
      customer_id: testIds.customerId,
      driver_id: testIds.driverId,
      pickup_address: "г. Москва, ул. Предоплатная, д. 1",
      customer_phone: "+74951112233",
      contact_phone: "+79261112233",
      payment_type: "cash",
      client_amount: 50000,
      executor_amount: 0,
      commission_amount: 0,
      payment_format: "prepaid",
      prepaid_deliveries_total: 5,
      container_number: "PREPAID-001",
      container_action: "install",
      container_volume: "20m3",
      comments: "Заказ с предоплатой",
    };

    const prepaidOrder = await OrderService.create(
      prepaidOrderData,
      testIds.userId,
    );
    logSuccess(`Заказ с предоплатой создан, ID: ${prepaidOrder.id}`);

    const updated = await OrderService.usePrepaidDelivery(prepaidOrder.id);
    if (updated.prepaid_deliveries_used === 1) {
      logSuccess("Предоплаченная доставка использована");
    } else {
      logError("Ошибка использования предоплаты");
    }

    await OrderService.delete(prepaidOrder.id);
    logSuccess("Заказ с предоплатой удален");
  } catch (error) {
    logError(`Ошибка в тесте usePrepaidDelivery: ${error.message}`);
    throw error;
  }
}

async function testDelete() {
  logStep("19. ТЕСТ: delete");

  try {
    const result = await OrderService.delete(testIds.relatedOrderId);
    if (result === testIds.relatedOrderId) {
      logSuccess("Заказ с исполнителем удален");
      testIds.relatedOrderId = null;
    } else {
      logError("Заказ не удален");
    }

    const deleted = await OrderService.getById(testIds.orderId);
    if (deleted) {
      logSuccess("Заказ с водителем остался (не удален)");
    }
  } catch (error) {
    logError(`Ошибка в тесте delete: ${error.message}`);
    throw error;
  }
}

async function cleanup() {
  logStep("Очистка тестовых данных");

  try {
    if (testIds.orderId) {
      await OrderService.delete(testIds.orderId);
      logSuccess("Заказ с водителем удален");
    }
    if (testIds.relatedOrderId) {
      await OrderService.delete(testIds.relatedOrderId);
      logSuccess("Связанный заказ удален");
    }

    if (testIds.customerId) {
      await CounterpartyService.delete(testIds.customerId);
      logSuccess("Клиент удален");
    }
    if (testIds.executorId) {
      await CounterpartyService.delete(testIds.executorId);
      logSuccess("Исполнитель удален");
    }

    if (testIds.driverId) {
      await Driver.destroy({ where: { id: testIds.driverId } });
      logSuccess("Водитель удален");
    }

    if (testIds.userId) {
      await User.destroy({ where: { id: testIds.userId } });
      logSuccess("Пользователь удален");
    }
  } catch (error) {
    logError(`Ошибка при очистке: ${error.message}`);
  }
}

async function runTests() {
  console.log(
    `${colors.bright}${colors.magenta}================================================================${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.magenta}   ПОЛНОЕ ТЕСТИРОВАНИЕ OrderService   ${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.magenta}================================================================${colors.reset}\n`,
  );

  try {
    await setupTestData();

    await testValidateOrderData();
    await testCreateOrder();
    await testGetById();
    await testGetAll();
    await testUpdateOrder();
    await testUpdateStatus();
    await testAssignDriver();
    await testAssignExecutor();
    await testAddCompletionPhoto();
    await testAddPaymentConfirmation();
    await testGetByCustomer();
    await testGetByDriver();
    await testGetByExecutor();
    await testSearchByNumber();
    await testSearchByAddress();
    await testGetOrderChain();
    await testGetStats();
    await testUsePrepaidDelivery();
    await testDelete();

    logStep("🎉 ВСЕ ТЕСТЫ OrderService УСПЕШНО ПРОЙДЕНЫ!");
  } catch (error) {
    logError(`\n❌ Тестирование прервано: ${error.message}`);
  } finally {
    await cleanup();
    await sequelize.close();
    console.log(`\n${colors.cyan}Тестирование завершено${colors.reset}`);
  }
}

runTests();
