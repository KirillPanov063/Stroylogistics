"use strict";

const { Op } = require("sequelize");
const db = require("../db/models");

const VAT_RATE = 0.22;
const VAT_MULTIPLIER = 1 - VAT_RATE; // 0.78

// Ставки зарплаты водителя: объём → действие
const DRIVER_RATES = {
  "8m3": {
    install: 750,
    pickup:  750,
    loading: 1500,
    replace: 1500,
    roll:    2250,
  },
  "20m3": {
    install: 1100,
    pickup:  1100,
    loading: 2200,
    replace: 2200,
    roll:    3300,
  },
  "27m3": {
    install: 1100,
    pickup:  1100,
    loading: 2200,
    replace: 2200,
    roll:    3300,
  },
};

const DEFAULT_DAILY_RATE = 5000;

class SalaryService {
  /**
   * Рассчитать нетто-сумму с учётом НДС.
   * Только invoice_with_vat уменьшается на 22%.
   */
  static calcNet(amount, paymentMethod) {
    if (!amount) return 0;
    const val = parseFloat(amount);
    return paymentMethod === "invoice_with_vat"
      ? Math.round(val * VAT_MULTIPLIER * 100) / 100
      : val;
  }

  /**
   * Проверить прибыльность заказа.
   * Возвращает предупреждение если компания уходит в минус.
   *
   * Сценарий 4: клиент платит наличными/картой, исполнитель получает по счёту
   *   → предупреждение если client_amount < executor_amount_net
   *
   * Сценарий 5: клиент платит по счёту, исполнитель получает наличными/картой
   *   → предупреждение если client_amount_net < executor_amount
   */
  static checkProfitability(data) {
    const {
      payment_type,
      client_amount,
      executor_payment_method,
      executor_amount,
    } = data;

    if (!client_amount || !executor_amount || !executor_payment_method) {
      return { isLoss: false, warning: null };
    }

    const clientNet = this.calcNet(client_amount, payment_type);
    const executorNet = this.calcNet(executor_amount, executor_payment_method);
    const profit = Math.round((clientNet - executorNet) * 100) / 100;

    if (profit >= 0) return { isLoss: false, warning: null };

    // Определяем сценарий для подсказки
    const clientIsCash = ["cash", "card_transfer"].includes(payment_type);
    const executorIsInvoice = ["invoice_with_vat", "invoice_without_vat"].includes(executor_payment_method);
    const clientIsInvoice = ["invoice_with_vat", "invoice_without_vat"].includes(payment_type);
    const executorIsCash = ["cash", "card_transfer"].includes(executor_payment_method);

    let scenario = "";
    if (clientIsCash && executorIsInvoice) {
      scenario =
        `Сценарий 4: клиент платит ${payment_type === "cash" ? "наличными" : "картой"} ` +
        `(${client_amount} ₽), исполнитель получает по счёту (${executor_amount} ₽, ` +
        `нетто ${executorNet} ₽ после НДС ${VAT_RATE * 100}%).`;
    } else if (clientIsInvoice && executorIsCash) {
      scenario =
        `Сценарий 5: клиент платит по счёту (${client_amount} ₽, ` +
        `нетто ${clientNet} ₽ после НДС ${VAT_RATE * 100}%), ` +
        `исполнитель получает ${executor_payment_method === "cash" ? "наличными" : "картой"} ` +
        `(${executor_amount} ₽).`;
    }

    return {
      isLoss: true,
      profit_loss: profit,
      client_amount_net: clientNet,
      executor_amount_net: executorNet,
      warning:
        `⚠️ Убыточная операция: компания теряет ${Math.abs(profit)} ₽. ` +
        scenario +
        ` Подтвердите сохранение заказа (is_loss_acknowledged: true).`,
    };
  }

  /**
   * Начислить зарплату сотруднику при завершении заказа.
   * Вызывается когда заказ переходит в статус 'completed'
   * и у него есть income_recipient_user_id (cash или card_transfer от клиента).
   */
  static async accrueForOrder(orderId, managerId) {
    const order = await db.Order.findByPk(orderId, {
      include: [{ model: db.Driver, as: "driver" }],
    });
    if (!order) throw new Error("Заказ не найден");

    // Начисление только для штатных водителей с привязанным аккаунтом
    if (!order.driver_id || !order.driver) return null;
    if (order.driver.driver_type !== "company") return null;
    if (!order.driver.user_id) return null;

    // Идемпотентность — не создаём дубль
    const existing = await db.SalaryAccrual.findOne({
      where: { order_id: orderId },
    });
    if (existing) return existing;

    const volumeRates = DRIVER_RATES[order.container_volume];
    const baseRate = volumeRates ? (volumeRates[order.container_action] || 0) : 0;
    if (!baseRate) return null; // действие или объём не указаны — начислять нечего

    const multiplier = parseFloat(order.distance_multiplier) || 1;
    const amount = Math.round(baseRate * multiplier * 100) / 100;

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    return db.SalaryAccrual.create({
      user_id: order.driver.user_id,
      order_id: orderId,
      accrual_type: "order_wage",
      amount,
      payment_method: null,
      period,
      status: "pending",
      accrued_by: managerId || null,
    });
  }

  /**
   * Начислить зарплату за работу на базе.
   * amount = days_count × daily_rate
   */
  static async accrueBaseWork({ userId, period, daysCount, dailyRate, managerId }) {
    if (!userId) throw new Error("user_id обязателен");
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      throw new Error("period обязателен в формате YYYY-MM");
    }
    if (!daysCount || daysCount <= 0) {
      throw new Error("days_count должен быть положительным числом");
    }

    const rate = dailyRate != null ? parseFloat(dailyRate) : DEFAULT_DAILY_RATE;
    if (isNaN(rate) || rate <= 0) throw new Error("daily_rate должна быть положительным числом");

    const [year, month] = period.split("-");
    const periodDate = `${year}-${month}-01`;
    const amount = Math.round(daysCount * rate * 100) / 100;

    return db.SalaryAccrual.create({
      user_id: userId,
      order_id: null,
      accrual_type: "base_work",
      amount,
      days_count: daysCount,
      daily_rate: rate,
      payment_method: null,
      period: periodDate,
      status: "pending",
      accrued_by: managerId || null,
    });
  }

  /**
   * Получить начисления зарплаты за период.
   * period — строка 'YYYY-MM' (например '2026-05')
   */
  static async getReport(period, userId = null) {
    const [year, month] = period.split("-");
    const periodDate = `${year}-${month}-01`;

    const where = { period: periodDate };
    if (userId) where.user_id = userId;

    const accruals = await db.SalaryAccrual.findAll({
      where,
      include: [
        {
          model: db.User,
          as: "employee",
          attributes: ["id", "full_name", "role"],
        },
        {
          model: db.Order,
          as: "order",
          attributes: [
            "id", "order_number", "pickup_address",
            "payment_type", "client_amount", "status",
          ],
        },
        {
          model: db.User,
          as: "accrued_by_user",
          attributes: ["id", "full_name"],
        },
      ],
      order: [["user_id", "ASC"], ["created_at", "ASC"]],
    });

    // Группируем по сотрудникам
    const byEmployee = {};
    for (const a of accruals) {
      const plain = a.get({ plain: true });
      const uid = plain.user_id;
      if (!byEmployee[uid]) {
        byEmployee[uid] = {
          employee: plain.employee,
          total_pending: 0,
          total_paid: 0,
          accruals: [],
        };
      }
      byEmployee[uid].accruals.push(plain);
      if (plain.status === "pending") {
        byEmployee[uid].total_pending += parseFloat(plain.amount);
      } else {
        byEmployee[uid].total_paid += parseFloat(plain.amount);
      }
    }

    return {
      period: periodDate,
      employees: Object.values(byEmployee),
    };
  }

  /**
   * Отметить начисления как выплаченные.
   */
  static async markAsPaid(accrualIds, paidAt = null) {
    const date = paidAt || new Date().toISOString().slice(0, 10);
    await db.SalaryAccrual.update(
      { status: "paid", paid_at: date },
      { where: { id: { [Op.in]: accrualIds } } },
    );
    return db.SalaryAccrual.findAll({
      where: { id: { [Op.in]: accrualIds } },
    });
  }
}

module.exports = SalaryService;
