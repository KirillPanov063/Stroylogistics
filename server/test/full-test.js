"use strict";

/**
 * Тесты для проверки внесённых исправлений.
 * Запуск: node test/full-test.js
 *
 * Часть тестов — unit-тесты (без БД).
 * Интеграционные тесты требуют запущенной БД и заполненного .env.
 */

const assert = require("assert");
const path = require("path");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// ============================================================
// 1. PriceService.validatePriceStructure — чистая функция, без БД
// ============================================================

console.log("\n[1] PriceService.validatePriceStructure");

const PriceService = require("../src/services/PriceService");

const validPrices = {
  invoice_with_vat:    { "8m3": 16000, "20m3": 33000, "27m3": 38000 },
  invoice_without_vat: { "8m3": 13500, "20m3": 27500, "27m3": 32000 },
  card_transfer:       { "8m3": 14000, "20m3": 29000, "27m3": 34000 },
  cash:                { "8m3": 14000, "20m3": 29000, "27m3": 34000 },
  default_payment_type: "invoice_with_vat",
};

test("валидная структура проходит проверку", () => {
  const result = PriceService.validatePriceStructure(validPrices);
  assert.strictEqual(result.isValid, true, `Ошибки: ${result.errors.join(", ")}`);
});

test("ключ cash_card больше не считается корректным типом оплаты", () => {
  const prices = {
    invoice_with_vat:    { "8m3": 14500, "20m3": 30000, "27m3": 35000 },
    invoice_without_vat: { "8m3": 12000, "20m3": 25000, "27m3": 29000 },
    cash_card:           { "8m3": 13500, "20m3": 28000, "27m3": 32000 },
    cash:                { "8m3": 13500, "20m3": 28000, "27m3": 32000 },
    default_payment_type: "invoice_with_vat",
  };
  const result = PriceService.validatePriceStructure(prices);
  assert.strictEqual(result.isValid, false, "Должна быть ошибка — нет card_transfer");
  assert.ok(
    result.errors.some((e) => e.includes("card_transfer")),
    `Ошибка должна упоминать card_transfer. Получено: ${result.errors.join(", ")}`,
  );
});

test("отсутствие card_transfer — ошибка валидации", () => {
  const prices = { ...validPrices };
  delete prices.card_transfer;
  const result = PriceService.validatePriceStructure(prices);
  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.some((e) => e.includes("card_transfer")));
});

test("отсутствие объёма 20m3 у cash — ошибка валидации", () => {
  const prices = JSON.parse(JSON.stringify(validPrices));
  delete prices.cash["20m3"];
  const result = PriceService.validatePriceStructure(prices);
  assert.strictEqual(result.isValid, false);
  assert.ok(result.errors.some((e) => e.includes("cash") && e.includes("20m3")));
});

test("отсутствие default_payment_type — ошибка валидации", () => {
  const prices = { ...validPrices };
  delete prices.default_payment_type;
  const result = PriceService.validatePriceStructure(prices);
  assert.strictEqual(result.isValid, false);
});

test("некорректное значение цены (строка 'abc') — ошибка валидации", () => {
  const prices = JSON.parse(JSON.stringify(validPrices));
  prices.cash["8m3"] = "abc";
  const result = PriceService.validatePriceStructure(prices);
  assert.strictEqual(result.isValid, false);
});

// ============================================================
// 2. Автовычисление commission_amount — проверяем логику OrderService
//    без обращения к БД (через приватную функцию validateOrderData)
// ============================================================

console.log("\n[2] OrderService.validateOrderData — арифметика комиссии");

const OrderService = require("../src/services/OrderService");

const baseOrderData = {
  customer_id: "00000000-0000-0000-0000-000000000001",
  pickup_address: "ул. Тестовая, 1",
  customer_phone: "+79990000001",
  contact_phone: "+79990000002",
  payment_type: "invoice_with_vat",
};

test("client = executor + commission — проходит", () => {
  const result = OrderService.validateOrderData({
    ...baseOrderData,
    executor_id: "00000000-0000-0000-0000-000000000002",
    client_amount: 16000,
    executor_amount: 14000,
    commission_amount: 2000,
  });
  assert.strictEqual(result.isValid, true, result.error);
});

test("client ≠ executor + commission — отклоняется", () => {
  const result = OrderService.validateOrderData({
    ...baseOrderData,
    executor_id: "00000000-0000-0000-0000-000000000002",
    client_amount: 16000,
    executor_amount: 14000,
    commission_amount: 3000, // 14000+3000 = 17000 ≠ 16000
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error.includes("равняться"));
});

test("водитель + нулевая комиссия — проходит", () => {
  const result = OrderService.validateOrderData({
    ...baseOrderData,
    driver_id: "00000000-0000-0000-0000-000000000003",
    client_amount: 15000,
    executor_amount: 0,
    commission_amount: 0,
  });
  assert.strictEqual(result.isValid, true, result.error);
});

test("водитель + ненулевой executor_amount — отклоняется", () => {
  const result = OrderService.validateOrderData({
    ...baseOrderData,
    driver_id: "00000000-0000-0000-0000-000000000003",
    executor_amount: 5000,
  });
  assert.strictEqual(result.isValid, false);
});

test("ни водитель ни исполнитель — отклоняется", () => {
  const result = OrderService.validateOrderData({ ...baseOrderData });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error.includes("водитель") || result.error.includes("исполнитель"));
});

test("одновременно водитель и исполнитель — отклоняется", () => {
  const result = OrderService.validateOrderData({
    ...baseOrderData,
    driver_id:   "00000000-0000-0000-0000-000000000003",
    executor_id: "00000000-0000-0000-0000-000000000002",
  });
  assert.strictEqual(result.isValid, false);
});

test("некорректный payment_type — отклоняется", () => {
  const result = OrderService.validateOrderData({
    ...baseOrderData,
    driver_id: "00000000-0000-0000-0000-000000000003",
    payment_type: "cash_card", // устаревший ключ
  });
  assert.strictEqual(result.isValid, false);
  assert.ok(result.error.includes("тип оплаты"));
});

test("card_transfer — корректный payment_type", () => {
  const result = OrderService.validateOrderData({
    ...baseOrderData,
    driver_id: "00000000-0000-0000-0000-000000000003",
    payment_type: "card_transfer",
    client_amount: 14000,
  });
  assert.strictEqual(result.isValid, true, result.error);
});

test("cash — корректный payment_type", () => {
  const result = OrderService.validateOrderData({
    ...baseOrderData,
    driver_id: "00000000-0000-0000-0000-000000000003",
    payment_type: "cash",
    client_amount: 14000,
  });
  assert.strictEqual(result.isValid, true, result.error);
});

// ============================================================
// 3. Структура default_prices в модели Counterparty
//    Проверяем, что в дефолтном значении нет cash_card
// ============================================================

console.log("\n[3] Counterparty model — структура default_prices");

test("defaultValue не содержит ключ cash_card", () => {
  // Читаем дефолтное значение из файла модели напрямую
  const modelFactory = require("../src/db/models/Counterparty");
  // Создаём минимальную заглушку sequelize чтобы прочитать defaultValue
  const stub = {
    define: (_name, fields) => fields,
    Sequelize: { Model: class {} },
  };
  const fields = modelFactory(stub);
  const def = fields.default_prices.defaultValue;
  assert.ok(!("cash_card" in def), `Найден устаревший ключ cash_card`);
});

test("defaultValue содержит card_transfer", () => {
  const modelFactory = require("../src/db/models/Counterparty");
  const stub = { define: (_name, fields) => fields, Sequelize: { Model: class {} } };
  const fields = modelFactory(stub);
  const def = fields.default_prices.defaultValue;
  assert.ok("card_transfer" in def, "Отсутствует ключ card_transfer");
});

test("defaultValue содержит cash", () => {
  const modelFactory = require("../src/db/models/Counterparty");
  const stub = { define: (_name, fields) => fields, Sequelize: { Model: class {} } };
  const fields = modelFactory(stub);
  const def = fields.default_prices.defaultValue;
  assert.ok("cash" in def, "Отсутствует ключ cash");
});

// ============================================================
// 4. SalaryService.calcNet — чистая функция, без БД
// ============================================================

console.log("\n[4] SalaryService.calcNet — расчёт нетто с учётом НДС");

const SalaryService = require("../src/services/SalaryService");

test("invoice_with_vat: 14500 × 0.78 = 11310", () => {
  const net = SalaryService.calcNet(14500, "invoice_with_vat");
  assert.strictEqual(net, 11310);
});

test("invoice_without_vat: сумма не уменьшается", () => {
  const net = SalaryService.calcNet(14500, "invoice_without_vat");
  assert.strictEqual(net, 14500);
});

test("cash: сумма не уменьшается", () => {
  const net = SalaryService.calcNet(14500, "cash");
  assert.strictEqual(net, 14500);
});

test("card_transfer: сумма не уменьшается", () => {
  const net = SalaryService.calcNet(14500, "card_transfer");
  assert.strictEqual(net, 14500);
});

test("нулевая сумма → 0", () => {
  const net = SalaryService.calcNet(0, "invoice_with_vat");
  assert.strictEqual(net, 0);
});

test("null сумма → 0", () => {
  const net = SalaryService.calcNet(null, "invoice_with_vat");
  assert.strictEqual(net, 0);
});

// ============================================================
// 5. SalaryService.checkProfitability — сценарии 4 и 5
// ============================================================

console.log("\n[5] SalaryService.checkProfitability — проверка убыточности");

test("нет executor_payment_method → проверка не запускается", () => {
  const result = SalaryService.checkProfitability({
    payment_type: "cash",
    client_amount: 10000,
    executor_payment_method: null,
    executor_amount: 14500,
  });
  assert.strictEqual(result.isLoss, false);
  assert.strictEqual(result.warning, null);
});

test("сценарий 4 — клиент cash, исполнитель invoice_with_vat — убыток: 10000 < 11310", () => {
  const result = SalaryService.checkProfitability({
    payment_type: "cash",
    client_amount: 10000,
    executor_payment_method: "invoice_with_vat",
    executor_amount: 14500,
  });
  assert.strictEqual(result.isLoss, true, "Должен быть убыток");
  assert.ok(result.profit_loss < 0, `profit_loss должен быть отрицательным: ${result.profit_loss}`);
  assert.ok(result.warning, "Должно быть предупреждение");
});

test("сценарий 4 — клиент cash 15000, исполнитель invoice_with_vat 14500 — прибыльно: 15000 > 11310", () => {
  const result = SalaryService.checkProfitability({
    payment_type: "cash",
    client_amount: 15000,
    executor_payment_method: "invoice_with_vat",
    executor_amount: 14500,
  });
  assert.strictEqual(result.isLoss, false);
});

test("сценарий 5 — клиент invoice_with_vat 14500, исполнитель cash 12000 — убыток: 11310 < 12000", () => {
  const result = SalaryService.checkProfitability({
    payment_type: "invoice_with_vat",
    client_amount: 14500,
    executor_payment_method: "cash",
    executor_amount: 12000,
  });
  assert.strictEqual(result.isLoss, true, "Должен быть убыток");
  assert.strictEqual(result.client_amount_net, 11310);
  assert.strictEqual(result.executor_amount_net, 12000);
});

test("сценарий 5 — клиент invoice_with_vat 14500, исполнитель cash 10000 — прибыльно: 11310 > 10000", () => {
  const result = SalaryService.checkProfitability({
    payment_type: "invoice_with_vat",
    client_amount: 14500,
    executor_payment_method: "cash",
    executor_amount: 10000,
  });
  assert.strictEqual(result.isLoss, false);
});

test("оба invoice_with_vat — НДС применяется к обоим, нет убытка при client > executor", () => {
  // client_net = 16000*0.78 = 12480, executor_net = 14000*0.78 = 10920 → прибыль
  const result = SalaryService.checkProfitability({
    payment_type: "invoice_with_vat",
    client_amount: 16000,
    executor_payment_method: "invoice_with_vat",
    executor_amount: 14000,
  });
  assert.strictEqual(result.isLoss, false);
});

// ============================================================
// 6. Автовычисление commission_amount — проверяем формулу
// ============================================================

console.log("\n[6] Автовычисление commission_amount");

test("commission = client - executor (16000 - 14000 = 2000)", () => {
  const client = 16000;
  const executor = 14000;
  const commission = parseFloat(client) - parseFloat(executor);
  assert.strictEqual(commission, 2000);
  // Автовычисленное значение должно проходить validateOrderData
  const validation = OrderService.validateOrderData({
    ...baseOrderData,
    executor_id: "00000000-0000-0000-0000-000000000002",
    client_amount: client,
    executor_amount: executor,
    commission_amount: commission,
  });
  assert.strictEqual(validation.isValid, true, validation.error);
});

test("commission = client - executor с дробными суммами (14500 - 12000 = 2500)", () => {
  const client = 14500;
  const executor = 12000;
  const commission = parseFloat(client) - parseFloat(executor);
  assert.strictEqual(commission, 2500);
  const validation = OrderService.validateOrderData({
    ...baseOrderData,
    executor_id: "00000000-0000-0000-0000-000000000002",
    client_amount: client,
    executor_amount: executor,
    commission_amount: commission,
  });
  assert.strictEqual(validation.isValid, true, validation.error);
});

// ============================================================
// 7. Интеграционные тесты (требуют запущенной БД)
// ============================================================

async function runIntegrationTests() {
  console.log("\n[7] Интеграционные тесты (требуют БД)");

  let db;
  try {
    require("dotenv").config({ path: path.join(__dirname, "../.env") });
    db = require("../src/db/models");
    await db.sequelize.authenticate();
  } catch (err) {
    console.log(`  ⚠ БД недоступна, интеграционные тесты пропущены (${err.message})`);
    return;
  }

  // Тест: getPriceForCustomer НЕ пишет в price_history
  await testAsync("getPriceForCustomer не загрязняет price_history", async () => {
    // Берём первого клиента с настроенными ценами
    const client = await db.Counterparty.findOne({
      where: { counterparty_type: "client" },
      attributes: ["id", "default_prices", "price_history"],
    });
    if (!client || !client.default_prices) {
      throw new Error("Нет клиента с настроенными ценами — запустите сидеры");
    }

    const historyBefore = (client.price_history || []).length;

    try {
      await PriceService.getPriceForCustomer(
        client.id,
        "8m3",
        "invoice_with_vat",
      );
    } catch {
      // Если цена не найдена — тест не применим
      return;
    }

    await client.reload();
    const historyAfter = (client.price_history || []).length;
    assert.strictEqual(
      historyAfter,
      historyBefore,
      `price_history вырос с ${historyBefore} до ${historyAfter} — recordPriceUsage не убран`,
    );
  });

  // Тест: getPriceForCustomer возвращает правильную цену для card_transfer
  await testAsync("getPriceForCustomer возвращает цену для card_transfer", async () => {
    const client = await db.Counterparty.findOne({
      where: { counterparty_type: "client" },
    });
    if (!client || !client.default_prices) return;

    const result = await PriceService.getPriceForCustomer(
      client.id,
      "8m3",
      "card_transfer",
    );
    assert.ok(result.price > 0, "Цена должна быть больше 0");
    assert.strictEqual(result.used_payment_type, "card_transfer");
  });

  // Тест: getPriceForCustomer возвращает правильную цену для cash
  await testAsync("getPriceForCustomer возвращает цену для cash", async () => {
    const client = await db.Counterparty.findOne({
      where: { counterparty_type: "client" },
    });
    if (!client || !client.default_prices) return;

    const result = await PriceService.getPriceForCustomer(
      client.id,
      "20m3",
      "cash",
    );
    assert.ok(result.price > 0, "Цена должна быть больше 0");
    assert.strictEqual(result.used_payment_type, "cash");
  });

  // Тест: updatePrices пишет в price_history
  await testAsync("updatePrices записывает в price_history", async () => {
    const client = await db.Counterparty.findOne({
      where: { counterparty_type: "client" },
    });
    if (!client) return;

    const historyBefore = (client.price_history || []).length;

    await PriceService.updatePrices(client.id, validPrices, "test-user");

    await client.reload();
    const historyAfter = (client.price_history || []).length;
    assert.strictEqual(
      historyAfter,
      historyBefore + 1,
      `Ожидался 1 новый элемент в history, получено: ${historyAfter - historyBefore}`,
    );

    // Откатываем изменение чтобы не ломать другие тесты
    await PriceService.updatePrices(client.id, client.default_prices || validPrices, "test-rollback");
  });

  // ---- SalaryService: интеграционные тесты ----
  // Проверяем что нужные таблицы/колонки существуют (миграции применены)

  let salaryMigrationsApplied = true;
  try {
    await db.sequelize.query("SELECT 1 FROM salary_accruals LIMIT 1");
    await db.sequelize.query("SELECT executor_payment_method FROM orders LIMIT 1");
  } catch {
    salaryMigrationsApplied = false;
    console.log("  ⚠ Таблица salary_accruals или колонка executor_payment_method отсутствуют.");
    console.log("    Выполните: npm run db:mig  — и запустите тесты снова.");
    console.log("    Тесты SalaryService пропущены.");
  }

  if (salaryMigrationsApplied) {
    // Тест: accrueForOrder идемпотентен — повторный вызов не дублирует запись
    await testAsync("accrueForOrder идемпотентен — повторный вызов не создаёт дубль", async () => {
      const order = await db.Order.findOne({
        where: {
          status: "completed",
          payment_type: ["cash", "card_transfer"],
          income_recipient_user_id: { [db.Sequelize.Op.ne]: null },
        },
      });
      if (!order) {
        console.log("    ⚠ Нет подходящего заказа — пропускаем");
        return;
      }

      await db.SalaryAccrual.destroy({ where: { order_id: order.id } });

      const first = await SalaryService.accrueForOrder(order.id, null);
      const second = await SalaryService.accrueForOrder(order.id, null);

      const count = await db.SalaryAccrual.count({ where: { order_id: order.id } });
      assert.strictEqual(count, 1, `Должна быть ровно 1 запись, найдено: ${count}`);
      assert.strictEqual(first.id, second.id, "Повторный вызов должен вернуть ту же запись");

      await db.SalaryAccrual.destroy({ where: { order_id: order.id } });
    });

    // Тест: getReport возвращает структуру с полем period и employees
    await testAsync("SalaryService.getReport возвращает корректную структуру", async () => {
      const report = await SalaryService.getReport("2026-05");
      assert.ok("period" in report, "Должно быть поле period");
      assert.ok(Array.isArray(report.employees), "employees должен быть массивом");
      assert.strictEqual(
        report.period,
        "2026-05-01",
        `Ожидался период 2026-05-01, получен: ${report.period}`,
      );
    });

    // Тест: markAsPaid обновляет статус записей
    await testAsync("SalaryService.markAsPaid меняет статус на paid", async () => {
      const user = await db.User.findOne();
      const order = await db.Order.findOne();
      if (!user || !order) {
        console.log("    ⚠ Нет пользователей или заказов — пропускаем");
        return;
      }

      // Удаляем возможное начисление по этому заказу чтобы избежать конфликта уникального индекса
      await db.SalaryAccrual.destroy({ where: { order_id: order.id } });

      const accrual = await db.SalaryAccrual.create({
        user_id: user.id,
        order_id: order.id,
        amount: 5000,
        payment_method: "cash",
        period: "2026-05-01",
        status: "pending",
      });

      await SalaryService.markAsPaid([accrual.id], "2026-05-31");
      await accrual.reload();

      assert.strictEqual(accrual.status, "paid", `Ожидался статус paid, получен: ${accrual.status}`);
      assert.strictEqual(
        accrual.paid_at,
        "2026-05-31",
        `Ожидалась дата выплаты 2026-05-31, получена: ${accrual.paid_at}`,
      );

      await accrual.destroy();
    });
  }

  await db.sequelize.close();
}

// ============================================================
// Запуск
// ============================================================

runIntegrationTests().then(() => {
  console.log(`\n${passed + failed} тестов: ${passed} прошло, ${failed} провалено`);
  if (failed > 0) process.exit(1);
});
