// full-test.js
// Запуск: node full-test.js

const axios = require("axios");
const { sequelize } = require("./src/db/models");
const crypto = require("crypto");

const API_URL = "http://localhost:3000/api";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bright: "\x1b[1m",
};

let tokens = { admin: null, manager: null };
let ids = {
  adminUser: null,
  managerUser: null,
  client: null,
  executor: null,
  orderWithDriver: null,
  orderWithExecutor: null,
  invoiceDoc: null,
};

let passed = 0;
let failed = 0;

function logSuccess(msg) {
  console.log(`${colors.green}✅ ${msg}${colors.reset}`);
  passed++;
}
function logError(msg) {
  console.log(`${colors.red}❌ ${msg}${colors.reset}`);
  failed++;
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
  } catch {
    return false;
  }
}

function generatePhone() {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============= 1. АУТЕНТИФИКАЦИЯ =============
async function testAuth() {
  logStep("1. АУТЕНТИФИКАЦИЯ");

  try {
    const admin = await axios.post(`${API_URL}/auth/signin`, {
      email: "admin@stroylogistics.ru",
      password: "Admin123!",
    });
    tokens.admin = admin.data.data.accessToken;
    ids.adminUser = admin.data.data.user.id;
    logSuccess("Админ вошел");

    const manager = await axios.post(`${API_URL}/auth/signin`, {
      email: "manager@stroylogistics.ru",
      password: "Manager123!",
    });
    tokens.manager = manager.data.data.accessToken;
    ids.managerUser = manager.data.data.user.id;
    logSuccess("Менеджер вошел");
  } catch (e) {
    logError(`Ошибка: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

// ============= 2. КОНТРАГЕНТЫ =============
async function testCounterparties() {
  logStep("2. КОНТРАГЕНТЫ");

  const headers = { Authorization: `Bearer ${tokens.manager}` };
  const uid = crypto.randomUUID().slice(0, 6);

  try {
    // Клиент с ценами
    const client = await axios.post(
      `${API_URL}/counterparties`,
      {
        counterparty_type: "client",
        person_type: "llc",
        representative_name: `ТестКлиент ${uid}`,
        representative_phone: generatePhone(),
        email: `client_${uid}@test.ru`,
        phone: generatePhone(),
        is_active: true,
        default_prices: {
          invoice_with_vat: { "8m3": 14500, "20m3": 30000, "27m3": 35000 },
          invoice_without_vat: { "8m3": 12000, "20m3": 25000, "27m3": 29000 },
          cash: { "8m3": 13500, "20m3": 28000, "27m3": 32000 },
          default_payment_type: "invoice_with_vat",
        },
      },
      { headers },
    );
    ids.client = client.data.data.id;
    logSuccess(`Клиент создан: ${ids.client}`);

    // Исполнитель
    const executor = await axios.post(
      `${API_URL}/counterparties`,
      {
        counterparty_type: "executor",
        person_type: "llc",
        representative_name: `ТестИсполнитель ${uid}`,
        representative_phone: generatePhone(),
        email: `executor_${uid}@test.ru`,
        phone: generatePhone(),
        is_active: true,
      },
      { headers },
    );
    ids.executor = executor.data.data.id;
    logSuccess(`Исполнитель создан: ${ids.executor}`);

    // Проверка цен
    const prices = await axios.get(`${API_URL}/prices/${ids.client}`, {
      headers,
    });
    logSuccess(
      `Цены: 20m3 с НДС = ${prices.data.data.invoice_with_vat["20m3"]} руб.`,
    );
  } catch (e) {
    logError(`Ошибка: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

// ============= 3. ЦЕНЫ =============
async function testPrices() {
  logStep("3. ЦЕНЫ");

  const headers = { Authorization: `Bearer ${tokens.manager}` };

  try {
    const calc = await axios.get(
      `${API_URL}/prices/calculate?counterparty_id=${ids.client}&container_volume=20m3`,
      { headers },
    );
    logSuccess(
      `Расчет цены: ${calc.data.data.price} руб. (${calc.data.data.used_payment_type})`,
    );

    const validate = await axios.post(
      `${API_URL}/prices/validate`,
      {
        prices: {
          invoice_with_vat: { "8m3": 14500, "20m3": 30000, "27m3": 35000 },
          invoice_without_vat: { "8m3": 12000, "20m3": 25000, "27m3": 29000 },
          cash: { "8m3": 13500, "20m3": 28000, "27m3": 32000 },
          default_payment_type: "invoice_with_vat",
        },
      },
      { headers },
    );
    logSuccess(`Валидация: ${validate.data.message}`);
  } catch (e) {
    logError(`Ошибка: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

// ============= 4. ЗАКАЗЫ =============
async function testOrders() {
  logStep("4. ЗАКАЗЫ");

  const headers = { Authorization: `Bearer ${tokens.manager}` };

  try {
    // Получаем водителя
    const [drivers] = await sequelize.query(
      `SELECT id FROM drivers WHERE is_active = true LIMIT 1;`,
    );
    if (!drivers.length) throw new Error("Нет водителей");

    // Заказ с водителем
    const order1 = await axios.post(
      `${API_URL}/orders`,
      {
        pickup_address: "Москва, ул. Тестовая, 1",
        customer_phone: generatePhone(),
        contact_phone: generatePhone(),
        payment_type: "invoice_with_vat",
        payment_format: "single",
        container_volume: "20m3",
        container_action: "install",
        customer_id: ids.client,
        driver_id: drivers[0].id,
        client_amount: 30000,
        executor_amount: 0,
        commission_amount: 0,
      },
      { headers },
    );
    ids.orderWithDriver = order1.data.data.id;
    logSuccess(`Заказ с водителем: ${ids.orderWithDriver}`);

    // Заказ с исполнителем
    const order2 = await axios.post(
      `${API_URL}/orders`,
      {
        pickup_address: "Москва, ул. Исполнителей, 10",
        customer_phone: generatePhone(),
        contact_phone: generatePhone(),
        payment_type: "invoice_with_vat",
        payment_format: "single",
        container_volume: "8m3",
        container_action: "install",
        customer_id: ids.client,
        executor_id: ids.executor,
        client_amount: 14500,
        executor_amount: 11000,
        commission_amount: 3500,
      },
      { headers },
    );
    ids.orderWithExecutor = order2.data.data.id;
    logSuccess(`Заказ с исполнителем: ${ids.orderWithExecutor}`);

    // Проверка полей
    const check = await axios.get(
      `${API_URL}/orders/${ids.orderWithExecutor}`,
      { headers },
    );
    logSuccess(`Статус счета: ${check.data.data.executor_invoice_status}`);
    logSuccess(`Статус оплаты: ${check.data.data.client_payment_status}`);
  } catch (e) {
    logError(`Ошибка: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

// ============= 5. СЧЕТА ИСПОЛНИТЕЛЕЙ =============
async function testInvoices() {
  logStep("5. СЧЕТА ИСПОЛНИТЕЛЕЙ");

  const headers = { Authorization: `Bearer ${tokens.manager}` };
  const invNum = `INV-${Date.now()}`;

  try {
    // Регистрация счета
    const register = await axios.post(
      `${API_URL}/executor-invoices/register`,
      {
        order_id: ids.orderWithExecutor,
        invoice_number: invNum,
        invoice_date: "2026-04-15",
        amount: 11000,
        file_path: `/uploads/invoices/${invNum}.pdf`,
        uploaded_by: ids.managerUser,
      },
      { headers },
    );
    logSuccess(`Счет зарегистрирован: ${register.data.message}`);
    await sleep(500);

    // Проверка статуса
    const info = await axios.get(
      `${API_URL}/executor-invoices/${ids.orderWithExecutor}`,
      { headers },
    );
    logSuccess(
      `Статус после регистрации: ${info.data.data.executor_invoice_status}`,
    );

    // Верификация
    const verify = await axios.put(
      `${API_URL}/executor-invoices/${ids.orderWithExecutor}/verify`,
      { verified_by: ids.managerUser },
      { headers },
    );
    logSuccess(`Счет проверен: ${verify.data.message}`);
    await sleep(500);

    // Подтверждение оплаты
    const payment = await axios.put(
      `${API_URL}/executor-invoices/${ids.orderWithExecutor}/confirm-payment`,
      {
        payment_confirm_file: `/uploads/payments/pay_${invNum}.pdf`,
        paid_by: ids.managerUser,
      },
      { headers },
    );
    logSuccess(`Оплата подтверждена: ${payment.data.message}`);
    await sleep(500);

    // Финальный статус
    const final = await axios.get(
      `${API_URL}/executor-invoices/${ids.orderWithExecutor}`,
      { headers },
    );
    logSuccess(`Финальный статус: ${final.data.data.executor_invoice_status}`);
  } catch (e) {
    logError(`Ошибка: ${e.response?.data?.message || e.message}`);
    throw e;
  }
}

// ============= 6. ДОКУМЕНТЫ =============
async function testDocuments() {
  logStep("6. ДОКУМЕНТЫ");

  const headers = { Authorization: `Bearer ${tokens.manager}` };

  try {
    // Создание документа через БД
    const { sequelize: dbSeq } = require("./src/db/models");
    const doc = await dbSeq.models.Document.create({
      id: crypto.randomUUID(),
      order_id: ids.orderWithExecutor,
      document_type: "executor_invoice",
      file_url: "/uploads/test/doc.pdf",
      file_name: "doc.pdf",
      file_size: 1024,
      mime_type: "application/pdf",
      document_number: `DOC-${Date.now()}`,
      document_date: "2026-04-15",
      amount: 11000,
      status: "active",
      created_by: ids.managerUser,
      created_at: new Date(),
      updated_at: new Date(),
    });
    ids.invoiceDoc = doc.id;
    logSuccess(`Документ создан: ${ids.invoiceDoc}`);

    // Получение документов заказа
    const orderDocs = await axios.get(
      `${API_URL}/documents/order/${ids.orderWithExecutor}`,
      { headers },
    );
    logSuccess(
      `Документов в заказе: ${orderDocs.data.data.executor_invoices?.length || 0}`,
    );

    // Получение по ID
    const oneDoc = await axios.get(`${API_URL}/documents/${ids.invoiceDoc}`, {
      headers,
    });
    logSuccess(`Документ найден: ${oneDoc.data.data.document_number}`);
  } catch (e) {
    logError(`Ошибка: ${e.response?.data?.message || e.message}`);
  }
}

// ============= 7. ПОИСК =============
async function testSearch() {
  logStep("7. ПОИСК");

  const headers = { Authorization: `Bearer ${tokens.manager}` };

  try {
    const invoices = await axios.get(`${API_URL}/executor-invoices`, {
      headers,
    });
    logSuccess(`Всего счетов: ${invoices.data.data.total}`);

    const history = await axios.get(`${API_URL}/prices/${ids.client}/history`, {
      headers,
    });
    logSuccess(`История цен: ${history.data.data.length} записей`);
  } catch (e) {
    logError(`Ошибка: ${e.response?.data?.message || e.message}`);
  }
}

// ============= 8. ОБНОВЛЕНИЯ =============
async function testUpdates() {
  logStep("8. ОБНОВЛЕНИЯ");

  const headers = { Authorization: `Bearer ${tokens.manager}` };

  try {
    const newPrices = {
      invoice_with_vat: { "8m3": 15000, "20m3": 31000, "27m3": 36000 },
      invoice_without_vat: { "8m3": 12500, "20m3": 26000, "27m3": 30000 },
      cash: { "8m3": 14000, "20m3": 29000, "27m3": 33000 },
      default_payment_type: "invoice_with_vat",
    };

    const update = await axios.put(
      `${API_URL}/prices/${ids.client}`,
      { prices: newPrices, changed_by: ids.managerUser },
      { headers },
    );
    logSuccess(`Цены обновлены: ${update.data.message}`);

    const newPrice = await axios.get(
      `${API_URL}/prices/calculate?counterparty_id=${ids.client}&container_volume=20m3`,
      { headers },
    );
    logSuccess(`Новая цена: ${newPrice.data.data.price} руб.`);
  } catch (e) {
    logError(`Ошибка: ${e.response?.data?.message || e.message}`);
  }
}

// ============= 9. ОШИБКИ =============
async function testErrors() {
  logStep("9. ОБРАБОТКА ОШИБОК");

  const headers = { Authorization: `Bearer ${tokens.manager}` };

  try {
    // Несуществующий контрагент
    try {
      await axios.get(
        `${API_URL}/prices/00000000-0000-0000-0000-000000000000`,
        { headers },
      );
      logError("Должна быть ошибка 404");
    } catch (e) {
      if (e.response?.status === 404) logSuccess("404 - контрагент не найден");
    }

    // Несуществующий документ
    try {
      await axios.get(
        `${API_URL}/documents/00000000-0000-0000-0000-000000000000`,
        { headers },
      );
      logError("Должна быть ошибка 404");
    } catch (e) {
      if (e.response?.status === 404) logSuccess("404 - документ не найден");
    }
  } catch (e) {
    logError(`Ошибка: ${e.message}`);
  }
}

// ============= 10. ОЧИСТКА =============
async function cleanup() {
  logStep("10. ОЧИСТКА");

  const headers = { Authorization: `Bearer ${tokens.admin}` };

  try {
    if (ids.invoiceDoc) {
      await axios
        .delete(`${API_URL}/documents/${ids.invoiceDoc}`, { headers })
        .catch(() => {});
      logSuccess("Документ удален");
    }
    if (ids.orderWithExecutor) {
      await axios
        .delete(`${API_URL}/orders/${ids.orderWithExecutor}`, { headers })
        .catch(() => {});
      logSuccess("Заказ с исполнителем удален");
    }
    if (ids.orderWithDriver) {
      await axios
        .delete(`${API_URL}/orders/${ids.orderWithDriver}`, { headers })
        .catch(() => {});
      logSuccess("Заказ с водителем удален");
    }
    if (ids.client) {
      await axios
        .delete(`${API_URL}/counterparties/${ids.client}`, { headers })
        .catch(() => {});
      logSuccess("Клиент удален");
    }
    if (ids.executor) {
      await axios
        .delete(`${API_URL}/counterparties/${ids.executor}`, { headers })
        .catch(() => {});
      logSuccess("Исполнитель удален");
    }
  } catch (e) {
    logError(`Ошибка очистки: ${e.message}`);
  }
}

// ============= ЗАПУСК =============
async function run() {
  console.log(
    `\n${colors.bright}${colors.magenta}================================================${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.magenta}     ПОЛНОЕ ТЕСТИРОВАНИЕ ФУНКЦИОНАЛА${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.magenta}================================================${colors.reset}\n`,
  );

  const serverOk = await checkServer();
  if (!serverOk) {
    console.error(
      `${colors.red}❌ Сервер не запущен! Запустите: npm run dev${colors.reset}`,
    );
    return;
  }
  logSuccess("Сервер доступен");

  try {
    await testAuth();
    await testCounterparties();
    await testPrices();
    await testOrders();
    await testInvoices();
    await testDocuments();
    await testSearch();
    await testUpdates();
    await testErrors();
  } catch (e) {
    logError(`Тестирование прервано: ${e.message}`);
  } finally {
    await cleanup();
  }

  console.log(
    `\n${colors.bright}${colors.magenta}================================================${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.green}✅ Пройдено: ${passed}${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.red}❌ Провалено: ${failed}${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.cyan}📊 Всего: ${passed + failed}${colors.reset}`,
  );
  console.log(
    `${colors.bright}${colors.magenta}================================================${colors.reset}\n`,
  );

  await sequelize.close();
}

run();
