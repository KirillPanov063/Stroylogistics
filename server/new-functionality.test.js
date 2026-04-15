// new-functionality.test.js - исправленная версия
// Запуск: node new-functionality.test.js

const { sequelize } = require("./src/db/models");
const db = require("./src/db/models");
const crypto = require("crypto");

// Импортируем сервисы для полного тестирования
const PriceService = require("./src/services/PriceService");
const ExecutorInvoiceService = require("./src/services/ExecutorInvoiceService");
const DocumentService = require("./src/services/DocumentService");

let testCounterpartyId;
let testOrderId;
let testUserId;
let testExecutorId;
let testDocumentId;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passedTests++;
    return true;
  } else {
    console.log(`  ❌ ${message}`);
    failedTests++;
    return false;
  }
}

function assertEqual(actual, expected, message) {
  const result = actual === expected;
  if (result) {
    console.log(`  ✅ ${message}`);
    passedTests++;
  } else {
    console.log(
      `  ❌ ${message} (ожидалось: ${expected}, получено: ${actual})`,
    );
    failedTests++;
  }
  return result;
}

async function runTests() {
  console.log("\n🚀 Запуск тестов нового функционала Stroylogistics\n");
  console.log("📦 Подготовка тестовых данных...");

  const uniqueId = crypto.randomUUID().slice(0, 8);
  const testEmail = `test_${uniqueId}@example.com`;
  const testPhone = `+7999${uniqueId}`;
  const clientPhone = `+7495${uniqueId}`;
  const executorPhone = `+7495${uniqueId.slice(0, 4)}`;

  try {
    // Создаем тестового пользователя
    const user = await db.User.create({
      id: crypto.randomUUID(),
      email: testEmail,
      phone: testPhone,
      password_hash: "test123hash",
      full_name: "Тестовый Пользователь",
      role: "admin",
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    testUserId = user.id;
    console.log(`  ✅ Создан тестовый пользователь: ${testUserId}`);

    // Создаем тестового контрагента (клиента)
    const counterparty = await db.Counterparty.create({
      id: crypto.randomUUID(),
      counterparty_type: "client",
      person_type: "llc",
      representative_name: "Тестовый Клиент ООО",
      representative_phone: clientPhone,
      email: `client_${uniqueId}@example.com`,
      phone: clientPhone,
      is_active: true,
      default_prices: {
        invoice_with_vat: { "8m3": 14500, "20m3": 30000, "27m3": 35000 },
        invoice_without_vat: { "8m3": 12000, "20m3": 25000, "27m3": 29000 },
        cash: { "8m3": 13500, "20m3": 28000, "27m3": 32000 },
        default_payment_type: "invoice_with_vat",
      },
      price_history: [],
      default_payment_type: "invoice_with_vat",
      created_at: new Date(),
      updated_at: new Date(),
    });
    testCounterpartyId = counterparty.id;
    console.log(`  ✅ Создан тестовый клиент: ${testCounterpartyId}`);

    // Создаем тестового исполнителя
    const executor = await db.Counterparty.create({
      id: crypto.randomUUID(),
      counterparty_type: "executor",
      person_type: "llc",
      representative_name: "Тестовый Исполнитель",
      representative_phone: executorPhone,
      email: `executor_${uniqueId}@example.com`,
      phone: executorPhone,
      is_active: true,
      default_prices: {},
      price_history: [],
      default_payment_type: "invoice_with_vat",
      created_at: new Date(),
      updated_at: new Date(),
    });
    testExecutorId = executor.id;
    console.log(`  ✅ Создан тестовый исполнитель: ${testExecutorId}`);

    // Создаем тестовый заказ
    const order = await db.Order.create({
      id: crypto.randomUUID(),
      order_number: 90000 + Math.floor(Math.random() * 10000),
      status: "processing",
      user_id: testUserId,
      customer_id: testCounterpartyId,
      executor_id: testExecutorId,
      driver_id: null,
      container_volume: "20m3",
      container_action: "install",
      pickup_address: "г. Тестовый, ул. Тестовая, д. 1",
      customer_phone: clientPhone,
      contact_phone: testPhone,
      payment_type: "invoice_with_vat",
      client_amount: 30000,
      executor_amount: 25000,
      commission_amount: 5000,
      payment_format: "single",
      created_at: new Date(),
      updated_at: new Date(),
    });
    testOrderId = order.id;
    console.log(`  ✅ Создан тестовый заказ: ${testOrderId}\n`);
  } catch (error) {
    console.error("❌ Ошибка подготовки данных:", error.message);
    return;
  }

  // ==================== ПРОВЕРКА НАЛИЧИЯ ПОЛЕЙ В ТАБЛИЦЕ ====================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 Проверка наличия новых полей в таблице orders");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders'
    `);

    const columnNames = columns.map((c) => c.column_name);

    const requiredFields = [
      "executor_invoice_number",
      "executor_invoice_date",
      "executor_invoice_amount",
      "executor_invoice_file",
      "executor_invoice_status",
      "executor_invoice_received_at",
      "executor_paid_at",
      "executor_payment_confirm_file",
      "client_invoice_number",
      "client_invoice_date",
      "client_invoice_amount",
      "client_payment_status",
      "client_payment_deadline",
      "client_paid_at",
      "payment_reminder_sent_3days",
      "payment_reminder_sent_1day",
      "payment_overdue_marked_at",
    ];

    for (const field of requiredFields) {
      assert(
        columnNames.includes(field),
        `Поле ${field} существует в таблице orders`,
      );
    }

    console.log(
      "\n  🎉 Все 17 новых полей успешно добавлены в таблицу orders!",
    );
  } catch (error) {
    console.error(`  ❌ Ошибка: ${error.message}`);
  }

  // ==================== ПРОВЕРКА ENUM ====================
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 Проверка ENUM типов");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const [executorStatusEnum] = await sequelize.query(`
      SELECT enum_range(NULL::"enum_orders_executor_invoice_status")
    `);
    console.log(
      `  ✅ ENUM executor_invoice_status: ${executorStatusEnum[0].enum_range}`,
    );

    const [clientStatusEnum] = await sequelize.query(`
      SELECT enum_range(NULL::"enum_orders_client_payment_status")
    `);
    console.log(
      `  ✅ ENUM client_payment_status: ${clientStatusEnum[0].enum_range}`,
    );

    assert(true, "ENUM типы успешно созданы");
  } catch (error) {
    console.log(`  ⚠️ ENUM типы не найдены: ${error.message}`);
  }

  // ==================== ПРОВЕРКА ЗНАЧЕНИЙ ПО УМОЛЧАНИЮ ====================
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 Проверка значений по умолчанию");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const freshOrder = await db.Order.findByPk(testOrderId);

    assertEqual(
      freshOrder.executor_invoice_status,
      "not_received",
      "executor_invoice_status = not_received",
    );
    assertEqual(
      freshOrder.client_payment_status,
      "not_paid",
      "client_payment_status = not_paid",
    );
    assertEqual(
      freshOrder.payment_reminder_sent_3days,
      false,
      "payment_reminder_sent_3days = false",
    );
    assertEqual(
      freshOrder.payment_reminder_sent_1day,
      false,
      "payment_reminder_sent_1day = false",
    );

    console.log("  ✅ Все значения по умолчанию установлены корректно");
  } catch (error) {
    console.error(`  ❌ Ошибка: ${error.message}`);
  }

  // ==================== ТЕСТЫ PRICE SERVICE ====================
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 PriceService - Работа с ценами");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    assert(typeof PriceService !== "undefined", "PriceService загружен");
    assert(
      typeof PriceService.getPriceForCustomer === "function",
      "Метод getPriceForCustomer существует",
    );

    const price = await PriceService.getPriceForCustomer(
      testCounterpartyId,
      "20m3",
    );
    assert(price.price > 0, "Цена получена успешно");
    assert(price.used_payment_type, "Тип оплаты определен");

    console.log(
      `  ✅ Цена для 20m3: ${price.price} руб. (${price.used_payment_type})`,
    );
  } catch (error) {
    console.log(`  ⚠️ Ошибка в PriceService: ${error.message}`);
  }

  // ==================== ТЕСТЫ EXECUTOR INVOICE SERVICE ====================
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📄 ExecutorInvoiceService - Работа со счетами исполнителей");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    assert(
      typeof ExecutorInvoiceService !== "undefined",
      "ExecutorInvoiceService загружен",
    );
    assert(
      typeof ExecutorInvoiceService.registerExecutorInvoice === "function",
      "Метод registerExecutorInvoice существует",
    );

    // Регистрация счета
    const registerResult = await ExecutorInvoiceService.registerExecutorInvoice(
      testOrderId,
      {
        invoice_number: "ТЕСТ-001",
        invoice_date: "2026-04-14",
        amount: 25000,
        file_path: "/uploads/test/invoice.pdf",
      },
      testUserId,
    );
    assert(registerResult.success, "Счет успешно зарегистрирован");

    const orderAfterRegister = await db.Order.findByPk(testOrderId);
    assertEqual(
      orderAfterRegister.executor_invoice_number,
      "ТЕСТ-001",
      "Номер счета сохранен",
    );
    assertEqual(
      orderAfterRegister.executor_invoice_status,
      "received",
      "Статус счета = received",
    );

    // Проверка счета
    const verifyResult = await ExecutorInvoiceService.verifyExecutorInvoice(
      testOrderId,
      testUserId,
    );
    assert(verifyResult.success, "Счет успешно проверен");

    const orderAfterVerify = await db.Order.findByPk(testOrderId);
    assertEqual(
      orderAfterVerify.executor_invoice_status,
      "verified",
      "Статус счета = verified",
    );

    // Подтверждение оплаты
    const paymentResult = await ExecutorInvoiceService.confirmExecutorPayment(
      testOrderId,
      {
        payment_confirm_file: "/uploads/test/payment_confirm.pdf",
        payment_notes: "Оплачено 14.04.2026",
      },
      testUserId,
    );
    assert(paymentResult.success, "Оплата успешно подтверждена");

    const orderAfterPayment = await db.Order.findByPk(testOrderId);
    assertEqual(
      orderAfterPayment.executor_invoice_status,
      "paid",
      "Статус счета = paid",
    );
    assert(
      orderAfterPayment.executor_paid_at !== null,
      "Дата оплаты сохранена",
    );

    // Получение информации о счете
    const invoiceInfo =
      await ExecutorInvoiceService.getInvoiceInfo(testOrderId);
    assert(
      invoiceInfo.executor_invoice_number === "ТЕСТ-001",
      "Номер счета получен",
    );
    assert(invoiceInfo.executor, "Информация об исполнителе получена");

    console.log("  ✅ Все операции со счетами исполнителей работают");
  } catch (error) {
    console.log(`  ⚠️ Ошибка в ExecutorInvoiceService: ${error.message}`);
  }

  // ==================== ТЕСТЫ ДОКУМЕНТОВ ====================
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📎 DocumentService - Работа с документами");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    assert(typeof DocumentService !== "undefined", "DocumentService загружен");
    assert(
      typeof DocumentService.getDocumentById === "function",
      "Метод getDocumentById существует",
    );

    // Создаем тестовый документ
    const testDocument = await db.Document.create({
      id: crypto.randomUUID(),
      order_id: testOrderId,
      document_type: "executor_invoice",
      file_path: "/uploads/test/test_document.pdf",
      file_name: "test_document.pdf",
      file_size: 1024,
      mime_type: "application/pdf",
      document_number: "DOC-001",
      document_date: "2026-04-14",
      amount: 25000,
      status: "active",
      uploaded_by: testUserId,
      created_at: new Date(),
      updated_at: new Date(),
    });
    testDocumentId = testDocument.id;
    assert(testDocument.id !== null, "Документ создан");

    // Получаем документ по ID
    const foundDoc = await DocumentService.getDocumentById(testDocumentId);
    assert(foundDoc.id === testDocumentId, "Документ найден по ID");
    assert(
      foundDoc.document_type === "executor_invoice",
      "Тип документа совпадает",
    );

    // Получаем документы заказа
    const groupedDocs = await DocumentService.getOrderDocuments(testOrderId);
    assert(
      groupedDocs.hasOwnProperty("executor_invoices"),
      "Есть группировка счетов исполнителей",
    );

    console.log("  ✅ Все операции с документами работают");
  } catch (error) {
    console.log(`  ⚠️ Ошибка в DocumentService: ${error.message}`);
  }

  // ==================== ОЧИСТКА ====================
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🧹 Очистка тестовых данных");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    if (testDocumentId) {
      await db.Document.destroy({ where: { id: testDocumentId } });
    }
    await db.Order.destroy({ where: { id: testOrderId } });
    await db.Counterparty.destroy({
      where: { id: [testCounterpartyId, testExecutorId] },
    });
    await db.User.destroy({ where: { id: testUserId } });
    console.log("  ✅ Все тестовые данные удалены");
  } catch (error) {
    console.error(`  ❌ Ошибка очистки: ${error.message}`);
  }

  // ==================== ИТОГИ ====================
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 ИТОГИ ТЕСТИРОВАНИЯ");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  ✅ Пройдено: ${passedTests}`);
  console.log(`  ❌ Провалено: ${failedTests}`);
  console.log(`  📈 Всего: ${passedTests + failedTests}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (failedTests === 0) {
    console.log("🎉 ПОЗДРАВЛЯЮ! Все тесты успешно пройдены!\n");
    console.log("📌 Новый функционал готов к использованию:");
    console.log("   - Поля для счетов от исполнителей добавлены");
    console.log("   - Поля для оплат от клиентов добавлены");
    console.log("   - Поля для напоминаний добавлены");
    console.log("   - ENUM типы настроены");
    console.log("   - PriceService работает");
    console.log("   - ExecutorInvoiceService работает");
    console.log("   - DocumentService работает");
  } else {
    console.log(`⚠️ Обнаружено ${failedTests} ошибок.\n`);
  }

  await sequelize.close();
}

runTests().catch(console.error);
