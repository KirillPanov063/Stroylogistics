"use strict";

const cron = require("node-cron");
const NotificationService = require("../services/NotificationService");
const EmailService = require("../services/EmailService");
const SalaryService = require("../services/SalaryService");

function startCronJobs() {
  console.log("⏰ Запуск cron-задач...");

  // ============================================================
  // 1. Документы водителей — каждый день в 09:00
  // ============================================================
  cron.schedule("0 9 * * *", async () => {
    console.log("[cron] Проверка документов водителей...");
    try {
      const entries = await NotificationService.getDriversWithExpiringDocs();
      if (!entries.length) return;

      const recipients = await NotificationService.getAdminsAndManagers();
      if (!recipients.length) return;

      for (const { driver, expiring } of entries) {
        for (const recipient of recipients) {
          try {
            await EmailService.sendDriverDocExpiry(
              recipient.email,
              recipient.full_name,
              driver,
              expiring,
            );
          } catch (err) {
            console.error(`[cron] Ошибка отправки email ${recipient.email}:`, err.message);
          }
        }

        const types = expiring.map((e) => e.type);
        await NotificationService.markDriverDocNotified(driver.id, types);
        console.log(`[cron] Уведомление о документах: ${driver.full_name} (${types.join(", ")})`);
      }
    } catch (err) {
      console.error("[cron] Ошибка задачи документов водителей:", err.message);
    }
  });

  // ============================================================
  // 2. Напоминания о заборе контейнера — каждый день в 09:00
  // ============================================================
  cron.schedule("0 9 * * *", async () => {
    console.log("[cron] Проверка напоминаний о заборе контейнера...");
    try {
      const orders = await NotificationService.getPickupReminders();
      if (!orders.length) return;

      for (const order of orders) {
        const plain = order.get({ plain: true });
        if (!plain.creator?.email) continue;

        try {
          await EmailService.sendPickupReminder(
            plain.creator.email,
            plain.creator.full_name,
            plain,
          );
          console.log(`[cron] Напоминание о заборе: заказ #${plain.order_number}`);
        } catch (err) {
          console.error(`[cron] Ошибка отправки напоминания о заборе #${plain.order_number}:`, err.message);
        }
      }
    } catch (err) {
      console.error("[cron] Ошибка задачи напоминаний о заборе:", err.message);
    }
  });

  // ============================================================
  // 3. Просроченная оплата клиентов — каждый день в 10:00
  // ============================================================
  cron.schedule("0 10 * * *", async () => {
    console.log("[cron] Проверка неоплаченных заказов...");
    try {
      const { regular, urgent } = await NotificationService.getUnpaidOrders();

      for (const order of regular) {
        const plain = order.get({ plain: true });
        if (!plain.creator?.email) continue;
        try {
          await EmailService.sendPaymentReminder(
            plain.creator.email,
            plain.creator.full_name,
            plain,
            false,
          );
          await NotificationService.markPaymentReminderSent(plain.id, "regular");
          console.log(`[cron] Напоминание об оплате (3д): заказ #${plain.order_number}`);
        } catch (err) {
          console.error(`[cron] Ошибка напоминания об оплате #${plain.order_number}:`, err.message);
        }
      }

      for (const order of urgent) {
        const plain = order.get({ plain: true });
        if (!plain.creator?.email) continue;
        try {
          await EmailService.sendPaymentReminder(
            plain.creator.email,
            plain.creator.full_name,
            plain,
            true,
          );
          await NotificationService.markPaymentReminderSent(plain.id, "urgent");
          console.log(`[cron] Срочное напоминание об оплате (7д): заказ #${plain.order_number}`);
        } catch (err) {
          console.error(`[cron] Ошибка срочного напоминания #${plain.order_number}:`, err.message);
        }
      }
    } catch (err) {
      console.error("[cron] Ошибка задачи неоплаченных заказов:", err.message);
    }
  });

  // ============================================================
  // 4. Счета от исполнителей не получены — каждый день в 11:00
  // ============================================================
  cron.schedule("0 11 * * *", async () => {
    console.log("[cron] Проверка счетов от исполнителей...");
    try {
      const orders = await NotificationService.getMissingExecutorInvoices();
      if (!orders.length) return;

      for (const order of orders) {
        const plain = order.get({ plain: true });
        if (!plain.creator?.email) continue;
        try {
          await EmailService.sendMissingInvoiceAlert(
            plain.creator.email,
            plain.creator.full_name,
            plain,
          );
          console.log(`[cron] Уведомление об отсутствии счёта: заказ #${plain.order_number}`);
        } catch (err) {
          console.error(`[cron] Ошибка уведомления о счёте #${plain.order_number}:`, err.message);
        }
      }
    } catch (err) {
      console.error("[cron] Ошибка задачи счетов исполнителей:", err.message);
    }
  });

  // ============================================================
  // 5. Зарплатный отчёт — каждый день в 08:00 (шлём в последний день месяца)
  // ============================================================
  cron.schedule("0 8 * * *", async () => {
    if (!NotificationService.isLastDayOfMonth()) return;

    console.log("[cron] Формирование зарплатного отчёта...");
    try {
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const report = await SalaryService.getReport(period);

      const recipients = await NotificationService.getAdminsAndManagers();
      for (const recipient of recipients) {
        try {
          await EmailService.sendSalaryReport(
            recipient.email,
            recipient.full_name,
            report,
          );
          console.log(`[cron] Зарплатный отчёт отправлен: ${recipient.email}`);
        } catch (err) {
          console.error(`[cron] Ошибка отправки отчёта ${recipient.email}:`, err.message);
        }
      }
    } catch (err) {
      console.error("[cron] Ошибка задачи зарплатного отчёта:", err.message);
    }
  });

  console.log("✅ Cron-задачи запущены");
}

module.exports = startCronJobs;
