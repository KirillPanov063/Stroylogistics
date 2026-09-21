"use strict";

const nodemailer = require("nodemailer");

class EmailService {
  static _transporter = null;

  static getTransporter() {
    if (!this._transporter) {
      this._transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    return this._transporter;
  }

  static isEnabled() {
    return process.env.EMAIL_ENABLED !== "false";
  }

  static async send(to, subject, html) {
    if (!this.isEnabled()) {
      console.log(`[email] отключён — пропуск письма: ${subject} → ${to}`);
      return;
    }
    await this.getTransporter().sendMail({
      from: process.env.SMTP_FROM || `"Stroylogistics" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  }

  // ============= Уведомления о документах водителей =============

  static async sendDriverDocExpiry(recipientEmail, recipientName, driver, expiringDocs) {
    const rows = expiringDocs.map((d) =>
      `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${d.label}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${d.date}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;color:${d.daysLeft <= 7 ? "#c0392b" : "#e67e22"};">
          ${d.daysLeft} дн.
        </td>
      </tr>`,
    ).join("");

    await this.send(
      recipientEmail,
      `⚠️ Истекают документы водителя — ${driver.full_name}`,
      `<div style="font-family:Arial,sans-serif;max-width:560px;">
        <h2 style="color:#c0392b;">Истекают документы водителя</h2>
        <p>Здравствуйте, ${recipientName}!</p>
        <p>У водителя <strong>${driver.full_name}</strong> (${driver.phone}) скоро истекают документы:</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px;text-align:left;">Документ</th>
              <th style="padding:8px;text-align:left;">Дата истечения</th>
              <th style="padding:8px;text-align:left;">Осталось</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:16px;color:#888;font-size:13px;">Stroylogistics — автоматическое уведомление</p>
      </div>`,
    );
  }

  // ============= Напоминание о заборе контейнера =============

  static async sendPickupReminder(recipientEmail, recipientName, order) {
    await this.send(
      recipientEmail,
      `🔔 Напоминание о заборе контейнера — заказ #${order.order_number}`,
      `<div style="font-family:Arial,sans-serif;max-width:560px;">
        <h2 style="color:#2980b9;">Напоминание о заборе контейнера</h2>
        <p>Здравствуйте, ${recipientName}!</p>
        <p>Сегодня запланирован забор контейнера:</p>
        <ul>
          <li><strong>Заказ:</strong> #${order.order_number}</li>
          <li><strong>Адрес:</strong> ${order.pickup_address}</li>
          <li><strong>Клиент:</strong> ${order.customer?.representative_name || "—"}</li>
          <li><strong>Телефон:</strong> ${order.customer?.phone || "—"}</li>
          <li><strong>Статус:</strong> ${order.status}</li>
        </ul>
        <p style="color:#888;font-size:13px;">Stroylogistics — автоматическое уведомление</p>
      </div>`,
    );
  }

  // ============= Напоминание об оплате =============

  static async sendPaymentReminder(recipientEmail, recipientName, order, isUrgent) {
    const urgentBadge = isUrgent
      ? `<p style="background:#fde8e8;padding:8px;border-radius:4px;color:#c0392b;">
           🚨 Срочно! Оплата сильно задерживается.
         </p>`
      : "";

    await this.send(
      recipientEmail,
      `${isUrgent ? "🚨" : "💰"} Неоплаченный заказ #${order.order_number}`,
      `<div style="font-family:Arial,sans-serif;max-width:560px;">
        <h2 style="color:#e67e22;">Напоминание об оплате</h2>
        <p>Здравствуйте, ${recipientName}!</p>
        ${urgentBadge}
        <p>Заказ завершён, но оплата не получена:</p>
        <ul>
          <li><strong>Заказ:</strong> #${order.order_number}</li>
          <li><strong>Адрес:</strong> ${order.pickup_address}</li>
          <li><strong>Клиент:</strong> ${order.customer?.representative_name || "—"}</li>
          <li><strong>Сумма:</strong> ${order.client_amount} ₽</li>
          <li><strong>Статус оплаты:</strong> ${order.client_payment_status}</li>
        </ul>
        <p style="color:#888;font-size:13px;">Stroylogistics — автоматическое уведомление</p>
      </div>`,
    );
  }

  // ============= Счёт исполнителя не получен =============

  static async sendMissingInvoiceAlert(recipientEmail, recipientName, order) {
    await this.send(
      recipientEmail,
      `📄 Не получен счёт от исполнителя — заказ #${order.order_number}`,
      `<div style="font-family:Arial,sans-serif;max-width:560px;">
        <h2 style="color:#8e44ad;">Счёт от исполнителя не получен</h2>
        <p>Здравствуйте, ${recipientName}!</p>
        <p>Заказ завершён, но счёт от исполнителя не поступил:</p>
        <ul>
          <li><strong>Заказ:</strong> #${order.order_number}</li>
          <li><strong>Клиент:</strong> ${order.customer?.representative_name || "—"}</li>
          <li><strong>Исполнитель:</strong> ${order.executor?.representative_name || "—"}</li>
          <li><strong>Телефон:</strong> ${order.executor?.phone || "—"}</li>
        </ul>
        <p style="color:#888;font-size:13px;">Stroylogistics — автоматическое уведомление</p>
      </div>`,
    );
  }

  // ============= Зарплатный отчёт =============

  static async sendSalaryReport(recipientEmail, recipientName, report) {
    const rows = report.employees.map((e) =>
      `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${e.employee?.full_name || "—"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${e.total_pending} ₽</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${e.total_paid} ₽</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${e.accruals.length}</td>
      </tr>`,
    ).join("");

    await this.send(
      recipientEmail,
      `📊 Зарплатный отчёт за ${report.period}`,
      `<div style="font-family:Arial,sans-serif;max-width:620px;">
        <h2 style="color:#1a1a1a;">Зарплатный отчёт — ${report.period}</h2>
        <p>Здравствуйте, ${recipientName}!</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px;text-align:left;">Сотрудник</th>
              <th style="padding:8px;text-align:left;">К выплате</th>
              <th style="padding:8px;text-align:left;">Выплачено</th>
              <th style="padding:8px;text-align:left;">Начислений</th>
            </tr>
          </thead>
          <tbody>${rows || "<tr><td colspan='4' style='padding:8px;'>Начислений нет</td></tr>"}</tbody>
        </table>
        <p style="margin-top:16px;color:#888;font-size:13px;">Stroylogistics — автоматическое уведомление</p>
      </div>`,
    );
  }

  static async sendVerificationCode(email, fullName, code) {
    const transporter = this.getTransporter();

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"Stroylogistics" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Подтверждение регистрации — Stroylogistics",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Добро пожаловать, ${fullName}!</h2>
          <p style="color: #444;">Для завершения регистрации введите код подтверждения:</p>
          <div style="
            background: #f5f5f5;
            border-radius: 8px;
            padding: 24px;
            text-align: center;
            margin: 24px 0;
          ">
            <span style="
              font-size: 40px;
              font-weight: bold;
              letter-spacing: 12px;
              color: #1a1a1a;
            ">${code}</span>
          </div>
          <p style="color: #888; font-size: 13px;">
            Код действителен 10 минут.<br>
            Если вы не регистрировались — проигнорируйте это письмо.
          </p>
        </div>
      `,
    });
  }
}

module.exports = EmailService;
