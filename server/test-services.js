const { sequelize } = require("./src/db/models");
const CounterpartyService = require("./src/services/CounterpartyService");
const CompanyDetailService = require("./src/services/CompanyDetailService");
const ObjectService = require("./src/services/ObjectService");
const RelationshipService = require("./src/services/RelationshipService");

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

async function testCounterpartyService() {
  logStep("Тестирование CounterpartyService");

  try {
    const uniqueTimestamp = Date.now();
    const random1 = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const random2 = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    const random3 = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");

    // 1. Создание контрагента (ООО)
    logInfo('Создание ООО "Тестовая Компания"...');
    const company = await CounterpartyService.create({
      counterparty_type: "client",
      person_type: "llc",
      representative_name: 'ООО "Тестовая Компания"',
      representative_phone: `+7926${uniqueTimestamp.toString().slice(-4)}${random1}`,
      email: `test${uniqueTimestamp}@company.ru`,
      phone: `+7495${uniqueTimestamp.toString().slice(-4)}${random2}`,
    });
    logSuccess(`Создан контрагент с ID: ${company.id}`);
    console.log("   Данные:", {
      name: company.representative_name,
      phone: company.representative_phone,
      type: company.person_type,
    });

    // 2. Создание контрагента (ИП) - с другим префиксом и случайным числом
    logInfo("Создание ИП Иванов...");
    const ip = await CounterpartyService.create({
      counterparty_type: "executor",
      person_type: "entrepreneur",
      representative_name: "ИП Иванов Иван Иванович",
      representative_phone: `+7927${uniqueTimestamp.toString().slice(-4)}${random2}`,
      email: `ip${uniqueTimestamp}@mail.ru`,
    });
    logSuccess(`Создан ИП с ID: ${ip.id}`);

    // 3. Создание контрагента (физлицо) - с третьим префиксом
    logInfo("Создание физического лица...");
    const individual = await CounterpartyService.create({
      counterparty_type: "client",
      person_type: "individual",
      representative_name: "Петров Петр Петрович",
      representative_phone: `+7928${uniqueTimestamp.toString().slice(-4)}${random3}`,
      email: `petrov${uniqueTimestamp}@mail.ru`,
    });
    logSuccess(`Создано физлицо с ID: ${individual.id}`);

    // 4. Получение всех контрагентов
    logInfo("Получение всех контрагентов...");
    const all = await CounterpartyService.getAll();
    logSuccess(`Найдено контрагентов: ${all.length}`);

    // 5. Поиск по телефону
    logInfo(
      "Поиск по телефону +7926" +
        uniqueTimestamp.toString().slice(-4) +
        random1 +
        "...",
    );
    const found = await CounterpartyService.findByPhone(
      `+7926${uniqueTimestamp.toString().slice(-4)}${random1}`,
    );
    if (found) {
      logSuccess(`Найден: ${found.representative_name}`);
    }

    // 6. Поиск по email
    logInfo("Поиск по email test" + uniqueTimestamp + "@company.ru...");
    const byEmail = await CounterpartyService.findByEmail(
      `test${uniqueTimestamp}@company.ru`,
    );
    if (byEmail) {
      logSuccess(`Найден по email: ${byEmail.representative_name}`);
    }

    // 7. Обновление контрагента
    logInfo("Обновление контрагента...");
    const updated = await CounterpartyService.update(company.id, {
      representative_name: 'ООО "Тестовая Компания" (обновлено)',
    });
    logSuccess(`Обновлено имя: ${updated.representative_name}`);

    // 8. Деактивация
    logInfo("Деактивация контрагента...");
    const deactivated = await CounterpartyService.deactivate(company.id);
    logSuccess(`Деактивирован: is_active = ${deactivated.is_active}`);

    // 9. Активация
    logInfo("Активация контрагента...");
    const activated = await CounterpartyService.activate(company.id);
    logSuccess(`Активирован: is_active = ${activated.is_active}`);

    return { company, ip, individual };
  } catch (error) {
    logError(`Ошибка в CounterpartyService: ${error.message}`);
    throw error;
  }
}
async function testCompanyDetailService(companyId, ipId) {
  logStep("Тестирование CompanyDetailService");

  try {
    // 1. Создание реквизитов для ООО
    logInfo("Создание реквизитов для ООО...");
    const companyDetails = await CompanyDetailService.create(companyId, {
      short_name_org: 'ООО "Тест"',
      full_name_org: 'Общество с ограниченной ответственностью "Тест"',
      legal_address: "г. Москва, ул. Ленина, д. 1",
      postal_address: "г. Москва, ул. Ленина, д. 1, офис 101",
      manager_position: "Генеральный директор",
      manager_full_name: "Сидоров Сидор Сидорович",
      bank_name: "ПАО Сбербанк",
      checking_account: "40702810940000000250",
      correspondent_account: "30101810400000000225",
      bic: "044525225",
      inn: "7701234567",
      kpp: "770101001",
      ogrn: "1234567890123",
    });
    logSuccess(`Реквизиты ООО созданы`);

    // 2. Создание реквизитов для ИП
    logInfo("Создание реквизитов для ИП...");
    const ipDetails = await CompanyDetailService.create(ipId, {
      short_name_org: "ИП Иванов И.И.",
      legal_address: "г. Москва, ул. Пушкина, д. 10",
      manager_position: "Индивидуальный предприниматель",
      manager_full_name: "Иванов Иван Иванович",
      bank_name: "АО Тинькофф Банк",
      checking_account: "40802810640000000333",
      correspondent_account: "30101810600000000333",
      bic: "044525333",
      inn: "123456789012",
      ogrn: "123456789012345",
      service_types: ["removal","replacement"],
      contract_number: "Д-2024-001",
      contract_date: "2024-01-15",
    });
    logSuccess(`Реквизиты ИП созданы`);

    // 3. Получение реквизитов по ID контрагента
    logInfo("Получение реквизитов ООО...");
    const fetched = await CompanyDetailService.getByCounterpartyId(companyId);
    if (fetched) {
      logSuccess(`Реквизиты найдены, ИНН: ${fetched.inn}`);
    }

    // 4. Поиск по ИНН
    logInfo("Поиск по ИНН 7701234567...");
    const byINN = await CompanyDetailService.findByINN("7701234567");
    if (byINN) {
      logSuccess(`Найдено по ИНН: ${byINN.short_name_org}`);
    }

    // 5. Обновление реквизитов
    logInfo("Обновление реквизитов...");
    const updated = await CompanyDetailService.update(companyId, {
      contract_number: "Д-2024-002",
    });
    logSuccess(`Обновлен номер договора: ${updated.contract_number}`);

    return { companyDetails, ipDetails };
  } catch (error) {
    logError(`Ошибка в CompanyDetailService: ${error.message}`);
    throw error;
  }
}

async function testObjectService(companyId, individualId) {
  logStep("Тестирование ObjectService");

  try {
    // 1. Создание объекта для ООО
    logInfo("Создание объекта для ООО...");
    const object1 = await ObjectService.create(companyId, {
      address: "г. Москва, ул. Тверская, д. 15",
      responsible_person: "Иванов Иван Иванович",
      responsible_phone: "+79261111111",
      notes: "Офисное здание, вход с торца",
    });
    logSuccess(`Создан объект с ID: ${object1.id}`);

    // 2. Создание второго объекта для ООО
    logInfo("Создание второго объекта для ООО...");
    const object2 = await ObjectService.create(companyId, {
      address: "г. Москва, ул. Арбат, д. 25",
      responsible_person: "Петров Петр Петрович",
      responsible_phone: "+79262222222",
      notes: "Магазин, погрузка с 9:00",
    });
    logSuccess(`Создан объект с ID: ${object2.id}`);

    // 3. Создание объекта для физлица
    logInfo("Создание объекта для физлица...");
    const object3 = await ObjectService.create(individualId, {
      address: "г. Москва, ул. Домодедовская, д. 15, кв. 45",
      responsible_person: "Петров Петр Петрович",
      responsible_phone: "+79269876543",
    });
    logSuccess(`Создан объект с ID: ${object3.id}`);

    // 4. Получение всех объектов контрагента
    logInfo("Получение объектов ООО...");
    const companyObjects = await ObjectService.getByCounterpartyId(companyId);
    logSuccess(`Найдено объектов у ООО: ${companyObjects.length}`);

    // 5. Поиск по адресу
    logInfo('Поиск объектов по адресу "Тверская"...');
    const byAddress = await ObjectService.searchByAddress("Тверская");
    logSuccess(`Найдено по адресу: ${byAddress.length}`);

    // 6. Поиск по ответственному лицу
    logInfo('Поиск по ответственному лицу "Петров"...');
    const byPerson = await ObjectService.searchByResponsiblePerson("Петров");
    logSuccess(`Найдено по ответственному: ${byPerson.length}`);

    // 7. Деактивация объекта
    logInfo("Деактивация объекта...");
    const deactivated = await ObjectService.deactivate(object2.id);
    logSuccess(`Объект деактивирован`);

    // 8. Статистика по объектам контрагента
    logInfo("Статистика по объектам ООО...");
    const stats = await ObjectService.getCounterpartyStats(companyId);
    console.log("   Статистика:", stats);

    return { object1, object2, object3 };
  } catch (error) {
    logError(`Ошибка в ObjectService: ${error.message}`);
    throw error;
  }
}

async function testRelationshipService(companyId, ipId) {
  logStep("Тестирование RelationshipService");

  try {
    // 1. Создание связи (клиент-исполнитель)
    logInfo("Создание связи между ООО и ИП...");
    const rel1 = await RelationshipService.create({
      client_id: companyId,
      executor_id: ipId,
      relationship_type: "service_provider",
      contract_number: "Д-2024-001",
      contract_date: "2024-01-15",
      notes: "Договор на вывоз мусора",
    });
    logSuccess(`Создана связь с ID: ${rel1.id}`);

    // 2. Получение связей клиента
    logInfo("Получение связей клиента (ООО)...");
    const clientRels = await RelationshipService.getByClientId(companyId);
    logSuccess(`Найдено связей у клиента: ${clientRels.length}`);

    // 3. Получение связей исполнителя
    logInfo("Получение связей исполнителя (ИП)...");
    const executorRels = await RelationshipService.getByExecutorId(ipId);
    logSuccess(`Найдено связей у исполнителя: ${executorRels.length}`);

    // 4. Поиск по номеру договора
    logInfo('Поиск по номеру договора "Д-2024-001"...');
    const byContract =
      await RelationshipService.searchByContractNumber("Д-2024-001");
    logSuccess(`Найдено по договору: ${byContract.length}`);

    // 5. Проверка наличия активной связи
    logInfo("Проверка наличия активной связи...");
    const hasActive = await RelationshipService.hasActiveRelationship(
      companyId,
      ipId,
    );
    logSuccess(`Активная связь ${hasActive ? "существует" : "отсутствует"}`);

    // 6. Деактивация связи
    logInfo("Деактивация связи...");
    const deactivated = await RelationshipService.deactivate(rel1.id);
    logSuccess(`Связь деактивирована`);

    // 7. Активация связи
    logInfo("Активация связи...");
    const activated = await RelationshipService.activate(rel1.id);
    logSuccess(`Связь активирована`);

    return { rel1 };
  } catch (error) {
    logError(`Ошибка в RelationshipService: ${error.message}`);
    throw error;
  }
}

async function cleanup(ids) {
  logStep("Очистка тестовых данных");

  try {
    // Удаление в обратном порядке (из-за внешних ключей)
    if (ids.relId) {
      await RelationshipService.delete(ids.relId);
      logSuccess(`Связь удалена`);
    }

    if (ids.companyId) {
      await CounterpartyService.delete(ids.companyId);
      logSuccess(`ООО удалено`);
    }

    if (ids.ipId) {
      await CounterpartyService.delete(ids.ipId);
      logSuccess(`ИП удалено`);
    }

    if (ids.individualId) {
      await CounterpartyService.delete(ids.individualId);
      logSuccess(`Физлицо удалено`);
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
    `${colors.bright}${colors.cyan}   ТЕСТИРОВАНИЕ СЕРВИСОВ КОНТРАГЕНТОВ   ${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.cyan}========================================${colors.reset}\n`,
  );

  let ids = {};

  try {
    // Проверка подключения к БД
    await sequelize.authenticate();
    logSuccess("Подключение к БД установлено\n");

    // Тестируем сервисы по порядку
    const counterparties = await testCounterpartyService();
    ids.companyId = counterparties.company.id;
    ids.ipId = counterparties.ip.id;
    ids.individualId = counterparties.individual.id;

    await testCompanyDetailService(ids.companyId, ids.ipId);
    await testObjectService(ids.companyId, ids.individualId);
    const rel = await testRelationshipService(ids.companyId, ids.ipId);
    ids.relId = rel.rel1.id;

    logStep("Все тесты успешно завершены! 🎉");

    // Автоматическая очистка
    await cleanup(ids);
    logSuccess("Тестовые данные очищены автоматически");
  } catch (error) {
    logError(`Тесты прерваны из-за ошибки: ${error.message}`);
    // При ошибке тоже пытаемся очистить
    await cleanup(ids);
  } finally {
    await sequelize.close();
  }
}

// Запуск тестов
runTests();
