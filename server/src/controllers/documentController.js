// controllers/documentController.js

const DocumentService = require("../services/DocumentService");
const formatResponse = require("../utils/formatResponse");

class DocumentController {
  /**
   * Загрузить документ
   * POST /api/documents/upload
   */
  async uploadDocument(req, res) {
    try {
      const {
        document_type,
        order_id,
        counterparty_id,
        object_id,
        document_number,
        document_date,
        amount,
      } = req.body;
      const uploaded_by = req.body.uploaded_by || req.user?.id;

      if (!uploaded_by) {
        return res
          .status(400)
          .json(
            formatResponse.error(
              "Не указан ID пользователя, загрузившего документ",
              null,
              400,
            ),
          );
      }

      const result = await DocumentService.uploadDocument(
        req.file,
        {
          document_type,
          order_id,
          counterparty_id,
          object_id,
          document_number,
          document_date,
          amount: amount ? parseFloat(amount) : null,
        },
        uploaded_by,
      );

      return res
        .status(201)
        .json(formatResponse.created("Документ успешно загружен", result));
    } catch (error) {
      console.error("Ошибка загрузки документа:", error);

      if (
        error.message.includes("Тип документа обязателен") ||
        error.message.includes("Недопустимый тип документа") ||
        error.message.includes("Документ должен быть связан")
      ) {
        return res
          .status(400)
          .json(formatResponse.error(error.message, error.message, 400));
      }

      if (error.message.includes("Файл не загружен")) {
        return res
          .status(400)
          .json(formatResponse.error(error.message, null, 400));
      }

      return res
        .status(500)
        .json(
          formatResponse.serverError(
            "Ошибка при загрузке документа",
            error.message,
          ),
        );
    }
  }

  /**
   * Получить документ по ID
   * GET /api/documents/:document_id
   */
  async getDocumentById(req, res) {
    try {
      const { document_id } = req.params;

      const document = await DocumentService.getDocumentById(document_id);

      return res
        .status(200)
        .json(formatResponse.success("Документ получен", document, 200));
    } catch (error) {
      console.error("Ошибка получения документа:", error);

      if (error.message.includes("не найден")) {
        return res
          .status(404)
          .json(formatResponse.notFound(error.message, error.message));
      }

      return res
        .status(500)
        .json(
          formatResponse.serverError(
            "Ошибка при получении документа",
            error.message,
          ),
        );
    }
  }

  /**
   * Получить документы с фильтрацией
   * GET /api/documents
   * Query: order_id, counterparty_id, object_id, document_type, status, date_from, date_to, limit, offset
   */
  async getDocuments(req, res) {
    try {
      const {
        order_id,
        counterparty_id,
        object_id,
        document_type,
        status,
        date_from,
        date_to,
        limit,
        offset,
      } = req.query;

      const filters = {};
      if (order_id) filters.order_id = order_id;
      if (counterparty_id) filters.counterparty_id = counterparty_id;
      if (object_id) filters.object_id = object_id;
      if (document_type) filters.document_type = document_type;
      if (status) filters.status = status;
      if (date_from) filters.date_from = date_from;
      if (date_to) filters.date_to = date_to;
      if (limit) filters.limit = parseInt(limit);
      if (offset) filters.offset = parseInt(offset);

      const result = await DocumentService.getDocuments(filters);

      return res
        .status(200)
        .json(formatResponse.success("Список документов получен", result, 200));
    } catch (error) {
      console.error("Ошибка получения списка документов:", error);
      return res
        .status(500)
        .json(
          formatResponse.serverError(
            "Ошибка при получении списка документов",
            error.message,
          ),
        );
    }
  }

  /**
   * Получить документы по заказу с группировкой
   * GET /api/documents/order/:order_id
   */
  async getOrderDocuments(req, res) {
    try {
      const { order_id } = req.params;

      if (!order_id) {
        return res
          .status(400)
          .json(formatResponse.error("Не указан ID заказа", null, 400));
      }

      const groupedDocuments =
        await DocumentService.getOrderDocuments(order_id);

      return res
        .status(200)
        .json(
          formatResponse.success(
            "Документы заказа получены",
            groupedDocuments,
            200,
          ),
        );
    } catch (error) {
      console.error("Ошибка получения документов заказа:", error);
      return res
        .status(500)
        .json(
          formatResponse.serverError(
            "Ошибка при получении документов заказа",
            error.message,
          ),
        );
    }
  }

  /**
   * Обновить информацию о документе
   * PUT /api/documents/:document_id
   */
  async updateDocumentInfo(req, res) {
    try {
      const { document_id } = req.params;
      const { document_number, document_date, amount, notes } = req.body;

      const result = await DocumentService.updateDocumentInfo(document_id, {
        document_number,
        document_date,
        amount: amount ? parseFloat(amount) : null,
        notes,
      });

      return res
        .status(200)
        .json(
          formatResponse.success(
            "Информация о документе обновлена",
            result,
            200,
          ),
        );
    } catch (error) {
      console.error("Ошибка обновления документа:", error);

      if (error.message.includes("не найден")) {
        return res
          .status(404)
          .json(formatResponse.notFound(error.message, error.message));
      }

      return res
        .status(500)
        .json(
          formatResponse.serverError(
            "Ошибка при обновлении документа",
            error.message,
          ),
        );
    }
  }

  /**
   * Удалить документ (мягкое удаление)
   * DELETE /api/documents/:document_id
   */
  async deleteDocument(req, res) {
    try {
      const { document_id } = req.params;
      const deleted_by = req.body.deleted_by || req.user?.id;

      if (!deleted_by) {
        return res
          .status(400)
          .json(
            formatResponse.error(
              "Не указан ID пользователя, удаляющего документ",
              null,
              400,
            ),
          );
      }

      const result = await DocumentService.deleteDocument(
        document_id,
        deleted_by,
      );

      return res
        .status(200)
        .json(formatResponse.success("Документ удален", result, 200));
    } catch (error) {
      console.error("Ошибка удаления документа:", error);

      if (error.message.includes("не найден")) {
        return res
          .status(404)
          .json(formatResponse.notFound(error.message, error.message));
      }

      return res
        .status(500)
        .json(
          formatResponse.serverError(
            "Ошибка при удалении документа",
            error.message,
          ),
        );
    }
  }

  /**
   * Физически удалить файл документа
   * DELETE /api/documents/:document_id/file
   */
  async deleteDocumentFile(req, res) {
    try {
      const { document_id } = req.params;

      const result = await DocumentService.deleteDocumentFile(document_id);

      return res
        .status(200)
        .json(formatResponse.success("Файл документа удален", result, 200));
    } catch (error) {
      console.error("Ошибка удаления файла документа:", error);

      if (error.message.includes("не найден")) {
        return res
          .status(404)
          .json(formatResponse.notFound(error.message, error.message));
      }

      return res
        .status(500)
        .json(
          formatResponse.serverError(
            "Ошибка при удалении файла документа",
            error.message,
          ),
        );
    }
  }

  /**
   * Очистить неиспользуемые файлы
   * POST /api/documents/cleanup
   */
  async cleanupOrphanedFiles(req, res) {
    try {
      const { days_old } = req.body;
      const daysOld = days_old ? parseInt(days_old) : 7;

      const result = await DocumentService.cleanupOrphanedFiles(daysOld);

      return res
        .status(200)
        .json(formatResponse.success("Очистка файлов выполнена", result, 200));
    } catch (error) {
      console.error("Ошибка очистки файлов:", error);
      return res
        .status(500)
        .json(
          formatResponse.serverError(
            "Ошибка при очистке файлов",
            error.message,
          ),
        );
    }
  }
}

module.exports = new DocumentController();
