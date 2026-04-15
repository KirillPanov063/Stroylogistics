// services/ExecutorInvoiceService.js

const db = require("../db/models");
const { Op } = require("sequelize");
const path = require("path");
const crypto = require("crypto");

class ExecutorInvoiceService {
  /**
   * Зарегистрировать счет от исполнителя
   * @param {string} orderId - ID заказа
   * @param {Object} invoiceData - Данные счета
   * @param {string} invoiceData.invoice_number - Номер счета
   * @param {string} invoiceData.invoice_date - Дата счета (YYYY-MM-DD)
   * @param {number} invoiceData.amount - Сумма счета
   * @param {string} invoiceData.file_path - Путь к файлу счета
   * @param {string} uploadedBy - ID пользователя, загрузившего счет
   * @returns {Promise<Object>} - Обновленный заказ
   */
  static async registerExecutorInvoice(orderId, invoiceData, uploadedBy) {
    const transaction = await db.sequelize.transaction();

    try {
      const order = await db.Order.findByPk(orderId, {
        include: [
          {
            model: db.Counterparty,
            as: "executor",
            attributes: ["id", "representative_name"],
          },
        ],
      });

      if (!order) {
        throw new Error(`Заказ с ID ${orderId} не найден`);
      }

      // Проверяем, есть ли исполнитель в заказе
      if (!order.executor_id) {
        throw new Error("В заказе не указан исполнитель");
      }

      // Проверяем, не зарегистрирован ли уже счет
      if (
        order.executor_invoice_status !== "not_received" &&
        order.executor_invoice_status !== "rejected"
      ) {
        throw new Error(
          `Счет уже зарегистрирован в статусе ${order.executor_invoice_status}`,
        );
      }

      // Валидация суммы счета
      if (invoiceData.amount <= 0) {
        throw new Error("Сумма счета должна быть больше 0");
      }

      // Опционально: проверяем соответствие суммы счета ожидаемой сумме
      if (
        order.executor_amount &&
        Math.abs(invoiceData.amount - order.executor_amount) > 0.01
      ) {
        console.warn(
          `Сумма счета (${invoiceData.amount}) отличается от ожидаемой (${order.executor_amount})`,
        );
      }

      // Обновляем заказ
      await order.update(
        {
          executor_invoice_number: invoiceData.invoice_number,
          executor_invoice_date: invoiceData.invoice_date,
          executor_invoice_amount: invoiceData.amount,
          executor_invoice_file: invoiceData.file_path,
          executor_invoice_status: "received",
          executor_invoice_received_at: new Date(),
          updated_at: new Date(),
        },
        { transaction },
      );

      // Создаем запись в таблице документов (если указан путь к файлу)
      if (invoiceData.file_path) {
        await db.Document.create(
          {
            id: crypto.randomUUID(),
            order_id: orderId,
            document_type: "executor_invoice",
            file_url: invoiceData.file_path,
            file_name: path.basename(invoiceData.file_path),
            file_size: 0,
            mime_type: "application/pdf",
            document_number: invoiceData.invoice_number,
            document_date: invoiceData.invoice_date,
            amount: invoiceData.amount,
            status: "active",
            created_by: uploadedBy,
            created_at: new Date(),
            updated_at: new Date(),
          },
          { transaction },
        );
      }

      await transaction.commit();

      return {
        success: true,
        order: order,
        message: "Счет от исполнителя успешно зарегистрирован",
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Ошибка регистрации счета от исполнителя:", error);
      throw error;
    }
  }

  /**
   * Подтвердить оплату счета исполнителю
   * @param {string} orderId - ID заказа
   * @param {Object} paymentData - Данные об оплате
   * @param {string} paymentData.payment_confirm_file - Путь к файлу подтверждения
   * @param {string} paymentData.payment_notes - Примечания к оплате
   * @param {string} paidBy - ID пользователя, подтвердившего оплату
   * @returns {Promise<Object>} - Обновленный заказ
   */
  static async confirmExecutorPayment(orderId, paymentData, paidBy) {
    const transaction = await db.sequelize.transaction();

    try {
      const order = await db.Order.findByPk(orderId);

      if (!order) {
        throw new Error(`Заказ с ID ${orderId} не найден`);
      }

      // Проверяем статус счета
      if (
        order.executor_invoice_status !== "received" &&
        order.executor_invoice_status !== "verified"
      ) {
        throw new Error(
          `Невозможно подтвердить оплату: статус счета ${order.executor_invoice_status}`,
        );
      }

      // Проверяем наличие суммы счета
      if (
        !order.executor_invoice_amount ||
        order.executor_invoice_amount <= 0
      ) {
        throw new Error("Не указана сумма счета для оплаты");
      }

      // Обновляем заказ
      await order.update(
        {
          executor_invoice_status: "paid",
          executor_paid_at: new Date(),
          executor_payment_confirm_file:
            paymentData.payment_confirm_file || null,
          updated_at: new Date(),
        },
        { transaction },
      );

      // Создаем запись об оплате в документах
      if (paymentData.payment_confirm_file) {
        await db.Document.create(
          {
            id: crypto.randomUUID(),
            order_id: orderId,
            document_type: "executor_payment_confirmation",
            file_url: paymentData.payment_confirm_file,
            file_name: path.basename(paymentData.payment_confirm_file),
            file_size: 0,
            mime_type: "application/pdf",
            status: "active",
            notes: paymentData.payment_notes || null,
            created_by: paidBy,
            created_at: new Date(),
            updated_at: new Date(),
          },
          { transaction },
        );
      }

      await transaction.commit();

      return {
        success: true,
        order: order,
        message: "Оплата исполнителю подтверждена",
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Ошибка подтверждения оплаты исполнителю:", error);
      throw error;
    }
  }

  /**
   * Проверить счет исполнителя (верификация)
   * @param {string} orderId - ID заказа
   * @param {string} verifiedBy - ID пользователя, проверившего счет
   * @param {Object} verificationData - Данные верификации
   * @returns {Promise<Object>} - Обновленный заказ
   */
  static async verifyExecutorInvoice(
    orderId,
    verifiedBy,
    verificationData = {},
  ) {
    try {
      const order = await db.Order.findByPk(orderId);

      if (!order) {
        throw new Error(`Заказ с ID ${orderId} не найден`);
      }

      if (order.executor_invoice_status !== "received") {
        throw new Error(
          `Невозможно проверить счет: текущий статус ${order.executor_invoice_status}`,
        );
      }

      await order.update({
        executor_invoice_status: "verified",
        updated_at: new Date(),
      });

      return {
        success: true,
        order: order,
        message: "Счет успешно проверен",
      };
    } catch (error) {
      console.error("Ошибка верификации счета:", error);
      throw error;
    }
  }

  /**
   * Отклонить счет исполнителя
   * @param {string} orderId - ID заказа
   * @param {string} reason - Причина отклонения
   * @param {string} rejectedBy - ID пользователя, отклонившего счет
   * @returns {Promise<Object>} - Обновленный заказ
   */
  static async rejectExecutorInvoice(orderId, reason, rejectedBy) {
    try {
      const order = await db.Order.findByPk(orderId);

      if (!order) {
        throw new Error(`Заказ с ID ${orderId} не найден`);
      }

      if (order.executor_invoice_status === "paid") {
        throw new Error("Нельзя отклонить уже оплаченный счет");
      }

      await order.update({
        executor_invoice_status: "rejected",
        updated_at: new Date(),
      });

      console.log(
        `Счет по заказу ${orderId} отклонен. Причина: ${reason}. Отклонил: ${rejectedBy}`,
      );

      return {
        success: true,
        order: order,
        message: `Счет отклонен. Причина: ${reason}`,
      };
    } catch (error) {
      console.error("Ошибка отклонения счета:", error);
      throw error;
    }
  }

  /**
   * Получить информацию о счете по заказу
   * @param {string} orderId - ID заказа
   * @returns {Promise<Object>} - Информация о счете
   */
  static async getInvoiceInfo(orderId) {
    try {
      const order = await db.Order.findByPk(orderId, {
        attributes: [
          "id",
          "order_number",
          "executor_id",
          "executor_invoice_number",
          "executor_invoice_date",
          "executor_invoice_amount",
          "executor_invoice_file",
          "executor_invoice_status",
          "executor_invoice_received_at",
          "executor_paid_at",
          "executor_payment_confirm_file",
        ],
        include: [
          {
            model: db.Counterparty,
            as: "executor",
            attributes: ["id", "representative_name"], // Убраны inn и kpp
          },
        ],
      });

      if (!order) {
        throw new Error(`Заказ с ID ${orderId} не найден`);
      }

      return order;
    } catch (error) {
      console.error("Ошибка получения информации о счете:", error);
      throw error;
    }
  }

  /**
   * Получить все счета исполнителей с фильтрацией
   * @param {Object} filters - Фильтры
   * @param {string} filters.status - Статус счета
   * @param {string} filters.executor_id - ID исполнителя
   * @param {string} filters.date_from - Дата с
   * @param {string} filters.date_to - Дата по
   * @returns {Promise<Array>} - Список заказов со счетами
   */
  static async getAllInvoices(filters = {}) {
    try {
      const whereClause = {};
      const orderWhereClause = {};

      if (filters.status) {
        whereClause.executor_invoice_status = filters.status;
      }

      if (filters.executor_id) {
        orderWhereClause.executor_id = filters.executor_id;
      }

      if (filters.date_from) {
        whereClause.executor_invoice_date = {
          [Op.gte]: filters.date_from,
        };
      }

      if (filters.date_to) {
        whereClause.executor_invoice_date = {
          ...whereClause.executor_invoice_date,
          [Op.lte]: filters.date_to,
        };
      }

      const orders = await db.Order.findAll({
        where: {
          ...orderWhereClause,
          executor_invoice_status: {
            [Op.ne]: null,
          },
        },
        attributes: [
          "id",
          "order_number",
          "executor_id",
          "executor_invoice_number",
          "executor_invoice_date",
          "executor_invoice_amount",
          "executor_invoice_status",
          "executor_invoice_received_at",
          "executor_paid_at",
        ],
        include: [
          {
            model: db.Counterparty,
            as: "executor",
            attributes: ["id", "representative_name"],
          },
        ],
        order: [["executor_invoice_received_at", "DESC"]],
      });

      return orders;
    } catch (error) {
      console.error("Ошибка получения списка счетов:", error);
      throw error;
    }
  }

  /**
   * Проверить просроченные счета для оплаты
   * @param {number} daysThreshold - Дней просрочки (по умолчанию 30)
   * @returns {Promise<Array>} - Список просроченных счетов
   */
  static async getOverdueInvoices(daysThreshold = 30) {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

      const overdueOrders = await db.Order.findAll({
        where: {
          executor_invoice_status: "verified",
          executor_invoice_received_at: {
            [Op.lt]: thresholdDate,
          },
        },
        attributes: [
          "id",
          "order_number",
          "executor_invoice_amount",
          "executor_invoice_received_at",
        ],
        include: [
          {
            model: db.Counterparty,
            as: "executor",
            attributes: ["id", "representative_name"],
          },
        ],
      });

      return overdueOrders;
    } catch (error) {
      console.error("Ошибка проверки просроченных счетов:", error);
      throw error;
    }
  }
}

module.exports = ExecutorInvoiceService;
