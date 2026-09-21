"use strict";

const { Op } = require("sequelize");
const db = require("../db/models");

const DAYS_BEFORE_EXPIRY = 30;        // уведомление за 30 дней
const PAYMENT_OVERDUE_DAYS = 3;       // напомнить через 3 дня после завершения заказа
const PAYMENT_URGENT_DAYS = 7;        // срочное напоминание через 7 дней
const INVOICE_MISSING_DAYS = 3;       // счёт не получен от исполнителя через 3 дня

class NotificationService {

  // ============= 1. ДОКУМЕНТЫ ВОДИТЕЛЕЙ =============

  /**
   * Возвращает водителей у которых документ истекает в течение DAYS_BEFORE_EXPIRY дней
   * и уведомление ещё не отправлено.
   * type: 'inspection' | 'permit' | 'insurance'
   */
  static async getDriversWithExpiringDocs() {
    const today = new Date();
    const threshold = new Date();
    threshold.setDate(today.getDate() + DAYS_BEFORE_EXPIRY);

    const drivers = await db.Driver.findAll({
      where: {
        is_active: true,
        [Op.or]: [
          {
            next_inspection_date: { [Op.between]: [today, threshold] },
            inspection_notified: false,
          },
          {
            permit_valid_until: { [Op.between]: [today, threshold] },
            permit_notified: false,
          },
          {
            insurance_valid_until: { [Op.between]: [today, threshold] },
            insurance_notified: false,
          },
        ],
      },
    });

    return drivers.map((d) => {
      const plain = d.get({ plain: true });
      const expiring = [];

      if (
        plain.next_inspection_date &&
        !plain.inspection_notified &&
        new Date(plain.next_inspection_date) <= threshold
      ) {
        expiring.push({
          type: "inspection",
          label: "Технический осмотр",
          date: plain.next_inspection_date,
          daysLeft: Math.ceil(
            (new Date(plain.next_inspection_date) - today) / 86400000,
          ),
        });
      }

      if (
        plain.permit_valid_until &&
        !plain.permit_notified &&
        new Date(plain.permit_valid_until) <= threshold
      ) {
        expiring.push({
          type: "permit",
          label: "Пропуск на въезд",
          date: plain.permit_valid_until,
          daysLeft: Math.ceil(
            (new Date(plain.permit_valid_until) - today) / 86400000,
          ),
        });
      }

      if (
        plain.insurance_valid_until &&
        !plain.insurance_notified &&
        new Date(plain.insurance_valid_until) <= threshold
      ) {
        expiring.push({
          type: "insurance",
          label: "Страховка",
          date: plain.insurance_valid_until,
          daysLeft: Math.ceil(
            (new Date(plain.insurance_valid_until) - today) / 86400000,
          ),
        });
      }

      return { driver: plain, expiring };
    }).filter((d) => d.expiring.length > 0);
  }

  static async markDriverDocNotified(driverId, types) {
    const update = {};
    if (types.includes("inspection")) update.inspection_notified = true;
    if (types.includes("permit"))     update.permit_notified = true;
    if (types.includes("insurance"))  update.insurance_notified = true;
    update.last_notification_date = new Date();
    await db.Driver.update(update, { where: { id: driverId } });
  }

  // ============= 2. НАПОМИНАНИЯ О ЗАБОРЕ КОНТЕЙНЕРА =============

  static async getPickupReminders() {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    return db.Order.findAll({
      where: {
        pickup_reminder_date: { [Op.between]: [startOfDay, endOfDay] },
        status: { [Op.notIn]: ["completed", "cancelled"] },
      },
      include: [
        { model: db.User, as: "creator", attributes: ["id", "email", "full_name"] },
        { model: db.Counterparty, as: "customer", attributes: ["representative_name", "phone"] },
      ],
    });
  }

  // ============= 3. ПРОСРОЧЕННАЯ ОПЛАТА КЛИЕНТОВ =============

  static async getUnpaidOrders() {
    const now = new Date();

    const overdueDateRegular = new Date(now);
    overdueDateRegular.setDate(now.getDate() - PAYMENT_OVERDUE_DAYS);

    const overdueDateUrgent = new Date(now);
    overdueDateUrgent.setDate(now.getDate() - PAYMENT_URGENT_DAYS);

    // 3-дневное напоминание
    const regular = await db.Order.findAll({
      where: {
        status: "completed",
        client_payment_status: { [Op.in]: ["not_paid", "partially_paid"] },
        payment_reminder_sent_3days: false,
        updated_at: { [Op.lte]: overdueDateRegular },
      },
      include: [
        { model: db.User, as: "creator", attributes: ["id", "email", "full_name"] },
        { model: db.Counterparty, as: "customer", attributes: ["representative_name", "phone"] },
      ],
    });

    // 7-дневное (срочное) напоминание
    const urgent = await db.Order.findAll({
      where: {
        status: "completed",
        client_payment_status: { [Op.in]: ["not_paid", "partially_paid"] },
        payment_reminder_sent_1day: false,
        updated_at: { [Op.lte]: overdueDateUrgent },
      },
      include: [
        { model: db.User, as: "creator", attributes: ["id", "email", "full_name"] },
        { model: db.Counterparty, as: "customer", attributes: ["representative_name", "phone"] },
      ],
    });

    return { regular, urgent };
  }

  static async markPaymentReminderSent(orderId, type) {
    const update = type === "urgent"
      ? { payment_reminder_sent_1day: true }
      : { payment_reminder_sent_3days: true };
    await db.Order.update(update, { where: { id: orderId } });
  }

  // ============= 4. СЧЕТА ОТ ИСПОЛНИТЕЛЕЙ =============

  static async getMissingExecutorInvoices() {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - INVOICE_MISSING_DAYS);

    return db.Order.findAll({
      where: {
        executor_id: { [Op.ne]: null },
        status: "completed",
        executor_invoice_status: "not_received",
        updated_at: { [Op.lte]: threshold },
      },
      include: [
        { model: db.User, as: "creator", attributes: ["id", "email", "full_name"] },
        { model: db.Counterparty, as: "executor", attributes: ["representative_name", "phone"] },
        { model: db.Counterparty, as: "customer", attributes: ["representative_name"] },
      ],
    });
  }

  // ============= 5. ЗАРПЛАТНЫЙ ОТЧЁТ =============

  static isLastDayOfMonth() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow.getMonth() !== today.getMonth();
  }

  static async getAdminsAndManagers() {
    return db.User.findAll({
      where: {
        role: { [Op.in]: ["admin", "manager"] },
        is_active: true,
        email_verified: true,
      },
      attributes: ["id", "email", "full_name"],
    });
  }
}

module.exports = NotificationService;
