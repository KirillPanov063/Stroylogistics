// controllers/executorInvoiceController.js

const ExecutorInvoiceService = require("../services/ExecutorInvoiceService");
const formatResponse = require("../utils/formatResponse");

class ExecutorInvoiceController {
  /**
   * Зарегистрировать счет от исполнителя
   * POST /api/executor-invoices/register
   */
  async registerInvoice(req, res) {
    try {
      const {
        order_id,
        invoice_number,
        invoice_date,
        amount,
        file_path,
        uploaded_by,
      } = req.body;

      if (!order_id) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан ID заказа", null, 400));
      }

      if (!invoice_number) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан номер счета", null, 400));
      }

      if (!invoice_date) {
        return res
          .status(400)
          .json(formatResponse.error("Не указана дата счета", null, 400));
      }

      if (!amount) {
        return res
          .status(400)
          .json(formatResponse.error("Не указана сумма счета", null, 400));
      }

      if (!uploaded_by) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан ID пользователя", null, 400));
      }

      if (isNaN(amount) || amount <= 0) {
        return res
          .status(400)
          .json(
            formatResponse.error(
              "Сумма счета должна быть положительным числом",
              null,
              400,
            ),
          );
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(invoice_date)) {
        return res
          .status(400)
          .json(
            formatResponse.error(
              "Неверный формат даты. Используйте YYYY-MM-DD",
              null,
              400,
            ),
          );
      }

      const result = await ExecutorInvoiceService.registerExecutorInvoice(
        order_id,
        { invoice_number, invoice_date, amount: parseFloat(amount), file_path },
        uploaded_by,
      );

      return res
        .status(201)
        .json(
          formatResponse.created("Счет от исполнителя зарегистрирован", result),
        );
    } catch (error) {
      console.error("Ошибка регистрации счета:", error);

      if (error.message.includes("не найден")) {
        return res
          .status(404)
          .json(formatResponse.notFound(error.message, error.message));
      }

      if (
        error.message.includes("уже зарегистрирован") ||
        error.message.includes("не указан исполнитель")
      ) {
        return res
          .status(400)
          .json(formatResponse.error(error.message, error.message, 400));
      }

      return res
        .status(500)
        .json(
          formatResponse.serverError(
            "Ошибка при регистрации счета",
            error.message,
          ),
        );
    }
  }

  /**
   * Подтвердить оплату исполнителю
   * PUT /api/executor-invoices/:order_id/confirm-payment
   */
  async confirmPayment(req, res) {
    try {
      const { order_id } = req.params;
      const { payment_confirm_file, payment_notes, paid_by } = req.body;

      if (!order_id) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан ID заказа", null, 400));
      }

      if (!paid_by) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан ID пользователя", null, 400));
      }

      const result = await ExecutorInvoiceService.confirmExecutorPayment(
        order_id,
        { payment_confirm_file, payment_notes },
        paid_by,
      );

      return res
        .status(200)
        .json(
          formatResponse.success(
            "Оплата исполнителю подтверждена",
            result,
            200,
          ),
        );
    } catch (error) {
      console.error("Ошибка подтверждения оплаты:", error);

      if (error.message.includes("не найден")) {
        return res
          .status(404)
          .json(formatResponse.notFound(error.message, error.message));
      }

      if (error.message.includes("Невозможно подтвердить оплату")) {
        return res
          .status(400)
          .json(formatResponse.error(error.message, error.message, 400));
      }

      return res
        .status(500)
        .json(
          formatResponse.serverError(
            "Ошибка при подтверждении оплаты",
            error.message,
          ),
        );
    }
  }

  /**
   * Проверить счет исполнителя
   * PUT /api/executor-invoices/:order_id/verify
   */
  async verifyInvoice(req, res) {
    try {
      const { order_id } = req.params;
      const { verified_by } = req.body;

      if (!order_id) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан ID заказа", null, 400));
      }

      if (!verified_by) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан ID пользователя", null, 400));
      }

      const result = await ExecutorInvoiceService.verifyExecutorInvoice(
        order_id,
        verified_by,
      );

      return res
        .status(200)
        .json(formatResponse.success("Счет успешно проверен", result, 200));
    } catch (error) {
      console.error("Ошибка проверки счета:", error);

      if (error.message.includes("не найден")) {
        return res
          .status(404)
          .json(formatResponse.notFound(error.message, error.message));
      }

      if (error.message.includes("Невозможно проверить счет")) {
        return res
          .status(400)
          .json(formatResponse.error(error.message, error.message, 400));
      }

      return res
        .status(500)
        .json(
          formatResponse.serverError(
            "Ошибка при проверке счета",
            error.message,
          ),
        );
    }
  }

  /**
   * Отклонить счет исполнителя
   * PUT /api/executor-invoices/:order_id/reject
   */
  async rejectInvoice(req, res) {
    try {
      const { order_id } = req.params;
      const { reason, rejected_by } = req.body;

      if (!order_id) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан ID заказа", null, 400));
      }

      if (!reason) {
        return res
          .status(400)
          .json(
            formatResponse.error("Не указана причина отклонения", null, 400),
          );
      }

      if (!rejected_by) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан ID пользователя", null, 400));
      }

      const result = await ExecutorInvoiceService.rejectExecutorInvoice(
        order_id,
        reason,
        rejected_by,
      );

      return res
        .status(200)
        .json(formatResponse.success("Счет отклонен", result, 200));
    } catch (error) {
      console.error("Ошибка отклонения счета:", error);

      if (error.message.includes("не найден")) {
        return res
          .status(404)
          .json(formatResponse.notFound(error.message, error.message));
      }

      if (error.message.includes("Нельзя отклонить")) {
        return res
          .status(400)
          .json(formatResponse.error(error.message, error.message, 400));
      }

      return res
        .status(500)
        .json(
          formatResponse.serverError(
            "Ошибка при отклонении счета",
            error.message,
          ),
        );
    }
  }

  /**
   * Получить информацию о счете по заказу
   * GET /api/executor-invoices/:order_id
   */
  async getInvoiceInfo(req, res) {
    try {
      const { order_id } = req.params;

      if (!order_id) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан ID заказа", null, 400));
      }

      const invoiceInfo = await ExecutorInvoiceService.getInvoiceInfo(order_id);

      return res
        .status(200)
        .json(
          formatResponse.success(
            "Информация о счете получена",
            invoiceInfo,
            200,
          ),
        );
    } catch (error) {
      console.error("Ошибка получения информации о счете:", error);

      if (error.message.includes("не найден")) {
        return res
          .status(404)
          .json(formatResponse.notFound(error.message, error.message));
      }

      return res
        .status(500)
        .json(
          formatResponse.serverError(
            "Ошибка при получении информации о счете",
            error.message,
          ),
        );
    }
  }

  /**
   * Получить все счета исполнителей
   * GET /api/executor-invoices
   */
  async getAllInvoices(req, res) {
    try {
      const { status, executor_id, date_from, date_to } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (executor_id) filters.executor_id = executor_id;
      if (date_from) filters.date_from = date_from;
      if (date_to) filters.date_to = date_to;

      const invoices = await ExecutorInvoiceService.getAllInvoices(filters);

      return res.status(200).json(
        formatResponse.success(
          "Список счетов получен",
          {
            total: invoices.length,
            invoices: invoices,
          },
          200,
        ),
      );
    } catch (error) {
      console.error("Ошибка получения списка счетов:", error);
      return res
        .status(500)
        .json(
          formatResponse.serverError(
            "Ошибка при получении списка счетов",
            error.message,
          ),
        );
    }
  }

  /**
   * Получить просроченные счета
   * GET /api/executor-invoices/overdue
   */
  async getOverdueInvoices(req, res) {
    try {
      const { days_threshold } = req.query;
      const threshold = days_threshold ? parseInt(days_threshold) : 30;

      const overdueInvoices =
        await ExecutorInvoiceService.getOverdueInvoices(threshold);

      return res.status(200).json(
        formatResponse.success(
          "Просроченные счета получены",
          {
            total: overdueInvoices.length,
            days_threshold: threshold,
            invoices: overdueInvoices,
          },
          200,
        ),
      );
    } catch (error) {
      console.error("Ошибка получения просроченных счетов:", error);
      return res
        .status(500)
        .json(
          formatResponse.serverError(
            "Ошибка при получении просроченных счетов",
            error.message,
          ),
        );
    }
  }
}

module.exports = new ExecutorInvoiceController();
