const axios = require("axios");
const { sequelize } = require("./src/db/models");

// Базовый URL API
const API_URL = "http://localhost:3000/api";

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

let adminToken = null;
let managerToken = null;
let createdOrderId = null;
let relatedOrderId = null;

// Тестовые данные
const testData = {
  // Менеджер (можно создать нового)
  manager: {
    email: `manager${Date.now()}@example.com`,
    phone: `+7927${Date.now().toString().slice(-7)}`,
    password: "Manager123!",
    full_name: "Тестовый Менеджер",
    role: "manager",
  },

  // Данные для создания заказа
  order: {
    customer_id: null,
    driver_id: null,
    pickup_address: "г. Москва, ул. Тестовая, д. 15, офис 305",
    customer_phone: "+74951112233",
    contact_phone: "+79261112233",
    payment_type: "invoice_with_vat",
    payment_amount: 15000,
    payment_format: "single",
    container_number: "TEST-CONT-001",
    container_action: "install",
    container_volume: "20m3",
    install_date: new Date().toISOString(),
    install_duration: "1 день",
    comments: "Тестовый заказ для проверки контроллера",
  },

  // Данные для второго заказа
  relatedOrder: {
    pickup_address: "г. Москва, ул. Вторая, д. 10",
    customer_phone: "+74951112233",
    contact_phone: "+79261112233",
    payment_type: "cash",
    payment_amount: 8000,
    payment_format: "single",
    container_action: "pickup",
    container_volume: "8m3",
    comments: "Связанный заказ",
  },

  // Обновленные данные
  updateData: {
    status: "processing",
    comments: "Обновлено менеджером",
  },

  // Данные для водителя
  driverData: {
    photoPath: "/uploads/completions/test-photo.jpg",
    filePath: "/uploads/payments/test-payment.pdf",
  },
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

async function checkServer() {
  try {
    await axios.get(`${API_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

async function getTestData() {
  try {
    // Получаем ID первого клиента (ООО)
    const [customer] = await sequelize.query(
      `SELECT id FROM counterparties WHERE person_type = 'llc' LIMIT 1;`,
    );

    // Получаем ID первого водителя
    const [driver] = await sequelize.query(
      `SELECT id FROM drivers WHERE is_active = true LIMIT 1;`,
    );

    // Получаем ID второго водителя
    const [secondDriver] = await sequelize.query(
      `SELECT id FROM drivers WHERE is_active = true LIMIT 1 OFFSET 1;`,
    );

    if (customer.length > 0) {
      testData.order.customer_id = customer[0].id;
      testData.relatedOrder.customer_id = customer[0].id;
    }

    if (driver.length > 0) {
      testData.order.driver_id = driver[0].id;
    }

    logInfo(`Тестовые данные загружены:`);
    logInfo(`   customer_id: ${testData.order.customer_id}`);
    logInfo(`   driver_id: ${testData.order.driver_id}`);
    if (secondDriver.length > 0) {
      logInfo(`   second_driver_id: ${secondDriver[0].id}`);
    }
  } catch (error) {
    logError(`Ошибка получения тестовых данных: ${error.message}`);
    throw error;
  }
}

async function setupUsers() {
  logStep("Настройка пользователей");

  try {
    // Проверка сервера
    logInfo("Проверка подключения к серверу...");
    const serverRunning = await checkServer();
    if (!serverRunning) {
      throw new Error(
        "Сервер не доступен. Запустите сервер командой npm run dev",
      );
    }
    logSuccess("Сервер доступен");

    // Регистрация менеджера
    logInfo("Регистрация менеджера...");
    try {
      await axios.post(`${API_URL}/auth/signup`, testData.manager);
      logSuccess("Менеджер зарегистрирован");
    } catch (error) {
      // Если менеджер уже существует (ошибка 400), просто входим
      if (error.response?.status === 400) {
        logInfo("Менеджер уже существует, пробуем войти");
      } else {
        throw error;
      }
    }

    // Вход менеджера
    logInfo("Вход менеджера...");
    const managerLogin = await axios.post(`${API_URL}/auth/signin`, {
      email: testData.manager.email,
      password: testData.manager.password,
    });
    managerToken = managerLogin.data.data.accessToken;
    logSuccess("Менеджер вошел в систему");

    // Вход существующего админа из сидов
    logInfo("Вход администратора (из сидов)...");
    const adminLogin = await axios.post(`${API_URL}/auth/signin`, {
      email: "admin@stroylogistics.ru",
      password: "Admin123!",
    });
    adminToken = adminLogin.data.data.accessToken;
    logSuccess("Администратор вошел в систему");
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      logError("Сервер не запущен! Запустите сервер: npm run dev");
    } else {
      logError(
        `Ошибка настройки пользователей: ${error.response?.data?.message || error.message}`,
      );
      if (error.response?.data) {
        logData("Детали ошибки", error.response.data);
      }
    }
    throw error;
  }
}

async function testCreateOrderByManager() {
  logStep("Тест 1: Создание заказа менеджером");

  try {
    const headers = { Authorization: `Bearer ${managerToken}` };

    logInfo("Создание нового заказа менеджером...");
    logData("Отправляемые данные", testData.order);

    const response = await axios.post(`${API_URL}/orders`, testData.order, {
      headers,
    });

    logSuccess(`Заказ создан менеджером`);
    logData("Созданный заказ", {
      id: response.data.data.id,
      order_number: response.data.data.order_number,
      status: response.data.data.status,
    });

    createdOrderId = response.data.data.id;
    return response.data.data;
  } catch (error) {
    logError(
      `Ошибка создания заказа менеджером: ${error.response?.data?.message || error.message}`,
    );
    if (error.response?.data) {
      logData("Детали ошибки", error.response.data);
    }
    throw error;
  }
}

async function testCreateRelatedOrderByAdmin() {
  logStep("Тест 2: Создание связанного заказа администратором");

  try {
    const headers = { Authorization: `Bearer ${adminToken}` };

    logInfo("Создание связанного заказа администратором...");

    const relatedOrderData = {
      ...testData.relatedOrder,
      customer_id: testData.order.customer_id,
      related_order_id: createdOrderId,
    };

    const response = await axios.post(`${API_URL}/orders`, relatedOrderData, {
      headers,
    });

    logSuccess(`Связанный заказ создан администратором`);
    relatedOrderId = response.data.data.id;
    logData("Связанный заказ", {
      id: response.data.data.id,
      order_number: response.data.data.order_number,
      related_order_id: response.data.data.related_order_id,
    });

    return response.data.data;
  } catch (error) {
    logError(
      `Ошибка создания заказа администратором: ${error.response?.data?.message || error.message}`,
    );
    throw error;
  }
}

async function testGetAllOrders() {
  logStep("Тест 3: Получение всех заказов");

  try {
    const headers = { Authorization: `Bearer ${managerToken}` };

    logInfo("Получение списка всех заказов...");
    const response = await axios.get(`${API_URL}/orders`, { headers });

    logSuccess(`Получено заказов: ${response.data.data.length}`);
    console.log(`   Первые 3 заказа:`);
    response.data.data.slice(0, 3).forEach((order) => {
      console.log(
        `   - #${order.order_number}: ${order.status} (${order.payment_type})`,
      );
    });
  } catch (error) {
    logError(
      `Ошибка получения заказов: ${error.response?.data?.message || error.message}`,
    );
    throw error;
  }
}

async function testGetOrderById() {
  logStep("Тест 4: Получение заказа по ID");

  try {
    const headers = { Authorization: `Bearer ${managerToken}` };

    logInfo(`Получение заказа с ID: ${createdOrderId}`);
    const response = await axios.get(`${API_URL}/orders/${createdOrderId}`, {
      headers,
    });

    logSuccess("Заказ получен");
    logData("Детали заказа", {
      order_number: response.data.data.order_number,
      status: response.data.data.status,
      address: response.data.data.pickup_address,
      payment: `${response.data.data.payment_amount} руб. (${response.data.data.payment_type})`,
      customer: response.data.data.customer?.representative_name,
    });
  } catch (error) {
    logError(
      `Ошибка получения заказа: ${error.response?.data?.message || error.message}`,
    );
    throw error;
  }
}

async function testUpdateOrderByManager() {
  logStep("Тест 5: Обновление заказа менеджером");

  try {
    const headers = { Authorization: `Bearer ${managerToken}` };

    logInfo(`Обновление заказа менеджером`);
    logData("Данные для обновления", testData.updateData);

    const response = await axios.put(
      `${API_URL}/orders/${createdOrderId}`,
      testData.updateData,
      { headers },
    );

    logSuccess("Заказ обновлен менеджером");
    logData("Обновленные данные", {
      status: response.data.data.status,
      comments: response.data.data.comments,
    });
  } catch (error) {
    logError(
      `Ошибка обновления заказа: ${error.response?.data?.message || error.message}`,
    );
    throw error;
  }
}

async function testUpdateStatusByManager() {
  logStep("Тест 6: Обновление статуса заказа");

  try {
    const headers = { Authorization: `Bearer ${managerToken}` };

    const newStatus = "assigned";
    logInfo(`Изменение статуса на "${newStatus}"`);

    const response = await axios.patch(
      `${API_URL}/orders/${createdOrderId}/status`,
      { status: newStatus },
      { headers },
    );

    logSuccess(`Статус изменен на: ${response.data.data.status}`);
  } catch (error) {
    logError(
      `Ошибка обновления статуса: ${error.response?.data?.message || error.message}`,
    );
    throw error;
  }
}

async function testAssignDriverByManager() {
  logStep("Тест 7: Назначение водителя менеджером");

  try {
    const headers = { Authorization: `Bearer ${managerToken}` };

    // Получаем ID другого водителя
    const [drivers] = await sequelize.query(
      `SELECT id FROM drivers WHERE is_active = true LIMIT 1 OFFSET 1;`,
    );

    if (drivers.length === 0) {
      logInfo("Нет второго водителя для теста");
      return;
    }

    const newDriverId = drivers[0].id;
    logInfo(`Назначение водителя ID: ${newDriverId}`);

    const response = await axios.patch(
      `${API_URL}/orders/${createdOrderId}/driver`,
      { driverId: newDriverId },
      { headers },
    );

    logSuccess(`Водитель назначен менеджером`);
  } catch (error) {
    logError(
      `Ошибка назначения водителя: ${error.response?.data?.message || error.message}`,
    );
    throw error;
  }
}

async function testAddCompletionPhotoByDriver() {
  logStep("Тест 8: Добавление фото водителем");

  try {
    // Создаем пользователя с ролью driver для теста
    const driverUser = {
      email: `driver${Date.now()}@example.com`,
      phone: `+7928${Date.now().toString().slice(-7)}`,
      password: "Driver123!",
      full_name: "Тестовый Водитель",
      role: "driver",
    };

    logInfo("Регистрация тестового водителя...");
    await axios.post(`${API_URL}/auth/signup`, driverUser);

    logInfo("Вход водителя...");
    const driverLogin = await axios.post(`${API_URL}/auth/signin`, {
      email: driverUser.email,
      password: driverUser.password,
    });
    const driverToken = driverLogin.data.data.accessToken;

    const headers = { Authorization: `Bearer ${driverToken}` };

    logInfo(`Добавление фото водителем: ${testData.driverData.photoPath}`);

    const response = await axios.patch(
      `${API_URL}/orders/${createdOrderId}/completion-photo`,
      { photoPath: testData.driverData.photoPath },
      { headers },
    );

    logSuccess(`Фото добавлено водителем`);
  } catch (error) {
    logError(
      `Ошибка добавления фото: ${error.response?.data?.message || error.message}`,
    );
    throw error;
  }
}

async function testAddPaymentConfirmationByManager() {
  logStep("Тест 9: Добавление подтверждения оплаты менеджером");

  try {
    const headers = { Authorization: `Bearer ${managerToken}` };

    logInfo(`Добавление подтверждения оплаты: ${testData.driverData.filePath}`);

    const response = await axios.patch(
      `${API_URL}/orders/${createdOrderId}/payment-confirmation`,
      { filePath: testData.driverData.filePath },
      { headers },
    );

    logSuccess(`Подтверждение оплаты добавлено менеджером`);
  } catch (error) {
    logError(
      `Ошибка добавления подтверждения: ${error.response?.data?.message || error.message}`,
    );
    throw error;
  }
}

async function testGetStats() {
  logStep("Тест 10: Получение статистики");

  try {
    const headers = { Authorization: `Bearer ${managerToken}` };

    logInfo("Получение статистики по заказам");
    const response = await axios.get(`${API_URL}/orders/stats/overview`, {
      headers,
    });

    logSuccess("Статистика получена");
    logData("Статистика", {
      total: response.data.data.total,
      by_status: response.data.data.by_status,
      by_payment_type: response.data.data.by_payment_type,
      total_amount: response.data.data.total_amount,
    });
  } catch (error) {
    logError(
      `Ошибка получения статистики: ${error.response?.data?.message || error.message}`,
    );
    throw error;
  }
}

async function testGetByCustomer() {
  logStep("Тест 11: Получение заказов клиента");

  try {
    const headers = { Authorization: `Bearer ${managerToken}` };

    logInfo(`Получение заказов для клиента ID: ${testData.order.customer_id}`);
    const response = await axios.get(
      `${API_URL}/orders/customer/${testData.order.customer_id}`,
      { headers },
    );

    logSuccess(`Найдено заказов клиента: ${response.data.data.length}`);
  } catch (error) {
    logError(
      `Ошибка получения заказов клиента: ${error.response?.data?.message || error.message}`,
    );
    throw error;
  }
}

async function testGetOrderChain() {
  logStep("Тест 12: Получение цепочки заказов");

  try {
    const headers = { Authorization: `Bearer ${managerToken}` };

    logInfo(`Получение цепочки для заказа ID: ${createdOrderId}`);
    const response = await axios.get(
      `${API_URL}/orders/${createdOrderId}/chain`,
      { headers },
    );

    logSuccess(`Цепочка получена, элементов: ${response.data.data.length}`);
    if (response.data.data.length > 1) {
      logInfo(`Связанных заказов: ${response.data.data.length - 1}`);
    }
  } catch (error) {
    logError(
      `Ошибка получения цепочки: ${error.response?.data?.message || error.message}`,
    );
    throw error;
  }
}

async function cleanup() {
  logStep("Очистка тестовых данных");

  try {
    const headers = { Authorization: `Bearer ${adminToken}` };

    if (relatedOrderId) {
      await axios.delete(`${API_URL}/orders/${relatedOrderId}`, { headers });
      logSuccess(`Связанный заказ удален`);
    }

    if (createdOrderId) {
      await axios.delete(`${API_URL}/orders/${createdOrderId}`, { headers });
      logSuccess(`Тестовый заказ удален`);
    }
  } catch (error) {
    logError(`Ошибка при очистке: ${error.message}`);
  }
}

async function runTests() {
  console.log(
    `${colors.bright}${colors.cyan}========================================${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.cyan}   ТЕСТИРОВАНИЕ ORDER CONTROLLER   ${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.cyan}========================================${colors.reset}\n`,
  );

  try {
    // Проверка подключения к БД
    await sequelize.authenticate();
    logSuccess("Подключение к БД установлено\n");

    // Получаем тестовые данные из БД
    await getTestData();

    // Настройка пользователей (менеджер + вход админа из сидов)
    await setupUsers();

    // Запускаем тесты
    await testCreateOrderByManager();
    await testCreateRelatedOrderByAdmin();
    await testGetAllOrders();
    await testGetOrderById();
    await testUpdateOrderByManager();
    await testUpdateStatusByManager();
    await testAssignDriverByManager();
    await testAddCompletionPhotoByDriver();
    await testAddPaymentConfirmationByManager();
    await testGetStats();
    await testGetByCustomer();
    await testGetOrderChain();

    logStep("🎉 Все тесты контроллера заказов успешно завершены!");

    // Очистка
    await cleanup();
    logSuccess("Тестовые данные очищены");
  } catch (error) {
    logError(`Тесты прерваны из-за ошибки: ${error.message}`);
    await cleanup();
  } finally {
    console.log(`\n${colors.cyan}Тестирование завершено${colors.reset}`);
    await sequelize.close();
  }
}

// Запуск тестов
runTests();
