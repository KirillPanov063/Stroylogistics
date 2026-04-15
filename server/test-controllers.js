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
};

let accessToken = null;

// Тестовые данные
const testData = {
  auth: {
    email: `test${Date.now()}@example.com`,
    phone: `+7926${Date.now().toString().slice(-7)}`,
    password: "Test123!",
    full_name: "Тестовый Пользователь",
  },

  counterparty: {
    company: {
      counterparty_type: "client",
      person_type: "llc",
      representative_name: 'ООО "Тест Контроллер"',
      representative_phone: `+7927${Date.now().toString().slice(-7)}`,
      email: `company${Date.now()}@test.ru`,
      phone: `+7495${Date.now().toString().slice(-7)}`,
    },
    ip: {
      counterparty_type: "executor",
      person_type: "entrepreneur",
      representative_name: "ИП Тестов Тест Тестович",
      representative_phone: `+7928${Date.now().toString().slice(-7)}`,
      email: `ip${Date.now()}@test.ru`,
    },
    individual: {
      counterparty_type: "client",
      person_type: "individual",
      representative_name: "Тестов Тест Тестович",
      representative_phone: `+7929${(Date.now() + 1).toString().slice(-7)}`,
      email: `individual${Date.now()}@test.ru`,
    },
  },

  companyDetails: {
    short_name_org: 'ООО "Тест"',
    full_name_org: 'Общество с ограниченной ответственностью "Тест"',
    legal_address: "г. Москва, ул. Тестовая, д. 1",
    manager_position: "Генеральный директор",
    manager_full_name: "Тестов Тест Тестович",
    bank_name: "ПАО Тест Банк",
    checking_account: "40702810940000000250",
    correspondent_account: "30101810400000000225",
    bic: "044525225",
    inn: "7701234567",
    kpp: "770101001",
    ogrn: "1234567890123",
  },

  ipDetails: {
    short_name_org: "ИП Тестов Т.Т.",
    legal_address: "г. Москва, ул. Тестовая, д. 10",
    manager_position: "Индивидуальный предприниматель",
    manager_full_name: "Тестов Тест Тестович",
    bank_name: "АО Тест Банк",
    checking_account: "40802810640000000333",
    correspondent_account: "30101810600000000333",
    bic: "044525333",
    inn: "123456789012",
    ogrn: "123456789012345",
    service_types: ["removal", "replacement"],
  },

  object: {
    address: "г. Москва, ул. Тестовая, д. 15",
    responsible_person: "Ответственный Тестович",
    responsible_phone: `+7925${Date.now().toString().slice(-7)}`,
    notes: "Тестовый объект",
  },

  relationship: {
    relationship_type: "service_provider",
    contract_number: `Д-${Date.now()}`,
    contract_date: new Date().toISOString().split("T")[0],
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

async function checkServer() {
  try {
    await axios.get(`${API_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

async function registerAndLogin() {
  logStep("Регистрация и вход");

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

    // Регистрация
    logInfo("Регистрация пользователя...");
    const signupRes = await axios.post(`${API_URL}/auth/signup`, testData.auth);
    logSuccess(`Регистрация: ${signupRes.data.message}`);

    // Вход
    logInfo("Вход в систему...");
    const loginRes = await axios.post(`${API_URL}/auth/signin`, {
      email: testData.auth.email,
      password: testData.auth.password,
    });

    accessToken = loginRes.data.data.accessToken;

    logSuccess(`Вход выполнен, токен получен`);
    logInfo(`Токен: ${accessToken.substring(0, 20)}...`);

    return loginRes.data.data.user;
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      logError("Сервер не запущен! Запустите сервер: npm run dev");
    } else {
      logError(
        `Ошибка аутентификации: ${error.response?.data?.message || error.message}`,
      );
      if (error.response?.data) {
        console.log("Детали:", JSON.stringify(error.response.data, null, 2));
      }
    }
    throw error;
  }
}

async function testCounterpartyController() {
  logStep("Тестирование CounterpartyController");

  try {
    const headers = { Authorization: `Bearer ${accessToken}` };
    const createdIds = {};

    // 1. Создание ООО
    logInfo("Создание ООО...");
    const companyRes = await axios.post(
      `${API_URL}/counterparties`,
      testData.counterparty.company,
      { headers },
    );
    logSuccess(`ООО создано, ID: ${companyRes.data.data.id}`);
    createdIds.company = companyRes.data.data.id;

    // 2. Создание ИП
    logInfo("Создание ИП...");
    const ipRes = await axios.post(
      `${API_URL}/counterparties`,
      testData.counterparty.ip,
      { headers },
    );
    logSuccess(`ИП создан, ID: ${ipRes.data.data.id}`);
    createdIds.ip = ipRes.data.data.id;

    // 3. Создание физлица
    logInfo("Создание физлица...");
    const individualRes = await axios.post(
      `${API_URL}/counterparties`,
      testData.counterparty.individual,
      { headers },
    );
    logSuccess(`Физлицо создано, ID: ${individualRes.data.data.id}`);
    createdIds.individual = individualRes.data.data.id;

    // 4. Получение всех контрагентов
    logInfo("Получение всех контрагентов...");
    const getAllRes = await axios.get(`${API_URL}/counterparties`, { headers });
    logSuccess(`Получено контрагентов: ${getAllRes.data.data.length}`);

    return createdIds;
  } catch (error) {
    logError(
      `Ошибка в CounterpartyController: ${error.response?.data?.message || error.message}`,
    );
    throw error;
  }
}

async function testCompanyDetailController(ids) {
  logStep("Тестирование CompanyDetailController");

  try {
    const headers = { Authorization: `Bearer ${accessToken}` };

    // 1. Создание реквизитов для ООО
    logInfo("Создание реквизитов для ООО...");
    await axios.post(
      `${API_URL}/company-details/${ids.company}`, // ✅ ИСПРАВЛЕНО
      testData.companyDetails,
      { headers },
    );
    logSuccess(`Реквизиты ООО созданы`);

    // 2. Создание реквизитов для ИП
    logInfo("Создание реквизитов для ИП...");
    await axios.post(
      `${API_URL}/company-details/${ids.ip}`, // ✅ ИСПРАВЛЕНО
      testData.ipDetails,
      { headers },
    );
    logSuccess(`Реквизиты ИП созданы`);

    // 3. Получение реквизитов
    logInfo("Получение реквизитов ООО...");
    const getRes = await axios.get(
      `${API_URL}/company-details/${ids.company}`, // ✅ ИСПРАВЛЕНО
      { headers },
    );
    logSuccess(`Реквизиты получены, ИНН: ${getRes.data.data.inn}`);

    // 4. Проверка наличия реквизитов
    logInfo("Проверка наличия реквизитов...");
    const checkRes = await axios.get(
      `${API_URL}/company-details/${ids.company}/check`, // ✅ ИСПРАВЛЕНО
      { headers },
    );
    logSuccess(
      `Реквизиты ${checkRes.data.data.hasDetails ? "есть" : "отсутствуют"}`,
    );

    // 5. Поиск по ИНН
    logInfo("Поиск по ИНН...");
    const searchRes = await axios.get(
      `${API_URL}/company-details/inn/${testData.companyDetails.inn}`, // ✅ ИСПРАВЛЕНО
      { headers },
    );
    logSuccess(`Найдено по ИНН: ${searchRes.data.data.short_name_org}`);
  } catch (error) {
    logError(
      `Ошибка в CompanyDetailController: ${error.response?.data?.message || error.message}`,
    );
    throw error;
  }
}

async function testObjectController(ids) {
  logStep("Тестирование ObjectController");

  try {
    const headers = { Authorization: `Bearer ${accessToken}` };

    // 1. Создание объекта для ООО
    logInfo("Создание объекта для ООО...");
    await axios.post(
      `${API_URL}/counterparties/${ids.company}/objects`, // ✅ ЭТОТ ПУТЬ ПРАВИЛЬНЫЙ
      testData.object,
      { headers },
    );
    logSuccess(`Объект создан`);

    // 2. Получение объектов контрагента
    logInfo("Получение объектов ООО...");
    const getRes = await axios.get(
      `${API_URL}/counterparties/${ids.company}/objects`, // ✅ ПРАВИЛЬНО
      { headers },
    );
    logSuccess(`Найдено объектов: ${getRes.data.data.length}`);

    // 3. Поиск по адресу
    logInfo("Поиск по адресу...");
    const searchRes = await axios.get(
      `${API_URL}/objects/search/address/${encodeURIComponent("Тестовая")}`, // ✅ ПРАВИЛЬНО
      { headers },
    );
    logSuccess(`Найдено по адресу: ${searchRes.data.data.length}`);
  } catch (error) {
    logError(
      `Ошибка в ObjectController: ${error.response?.data?.message || error.message}`,
    );
    throw error;
  }
}

async function testRelationshipController(ids) {
  logStep("Тестирование RelationshipController");

  try {
    const headers = { Authorization: `Bearer ${accessToken}` };

    // 1. Создание связи
    logInfo("Создание связи...");
    const createRes = await axios.post(
      `${API_URL}/relationships`,
      {
        client_id: ids.company,
        executor_id: ids.ip,
        relationship_type: "service_provider",
        contract_number: testData.relationship.contract_number,
        contract_date: testData.relationship.contract_date,
      },
      { headers },
    );
    logSuccess(`Связь создана, ID: ${createRes.data.data.id}`);

    // 2. Получение связей клиента
    logInfo("Получение связей клиента...");
    const clientRelsRes = await axios.get(
      `${API_URL}/relationships/client/${ids.company}`, // ✅ ПРАВИЛЬНО
      { headers },
    );
    logSuccess(`Связей у клиента: ${clientRelsRes.data.data.length}`);

    // 3. Поиск по договору
    logInfo("Поиск по договору...");
    const searchRes = await axios.get(
      `${API_URL}/relationships/contract/${testData.relationship.contract_number}`, // ✅ ПРАВИЛЬНО
      { headers },
    );
    logSuccess(`Найдено по договору: ${searchRes.data.data.length}`);
  } catch (error) {
    logError(
      `Ошибка в RelationshipController: ${error.response?.data?.message || error.message}`,
    );
    throw error;
  }
}

async function cleanup(ids) {
  logStep("Очистка тестовых данных");

  try {
    const headers = { Authorization: `Bearer ${accessToken}` };

    // Удаление в обратном порядке
    if (ids.relationshipId) {
      await axios.delete(`${API_URL}/relationships/${ids.relationshipId}`, {
        headers,
      });
      logSuccess("Связь удалена");
    }

    if (ids.company) {
      await axios.delete(`${API_URL}/counterparties/${ids.company}`, {
        headers,
      });
      logSuccess("ООО удалено");
    }

    if (ids.ip) {
      await axios.delete(`${API_URL}/counterparties/${ids.ip}`, { headers });
      logSuccess("ИП удалено");
    }

    if (ids.individual) {
      await axios.delete(`${API_URL}/counterparties/${ids.individual}`, {
        headers,
      });
      logSuccess("Физлицо удалено");
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
    `${colors.bright}${colors.cyan}   ТЕСТИРОВАНИЕ КОНТРОЛЛЕРОВ   ${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.cyan}========================================${colors.reset}\n`,
  );

  let ids = {};

  try {
    // Проверка подключения к БД
    await sequelize.authenticate();
    logSuccess("Подключение к БД установлено\n");

    // Регистрация и вход
    await registerAndLogin();

    // Тестируем контроллеры
    ids = await testCounterpartyController();
    await testCompanyDetailController(ids);
    await testObjectController(ids);
    await testRelationshipController(ids);

    logStep("Все тесты контроллеров успешно завершены! 🎉");

    // Очистка
    await cleanup(ids);
    logSuccess("Тестовые данные очищены");
  } catch (error) {
    logError(`Тесты прерваны из-за ошибки: ${error.message}`);
    await cleanup(ids);
  } finally {
    console.log(`\n${colors.cyan}Тестирование завершено${colors.reset}`);
    process.exit(0);
  }
}

// Запуск тестов
runTests();
