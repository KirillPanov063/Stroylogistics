// services/DocumentService.js

const db = require("../db/models");
const { Op } = require("sequelize");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");

class DocumentService {
  /**
   * Загрузить файл документа
   * @param {Object} file - Файл из multer
   * @param {Object} documentData - Данные документа
   * @param {string} documentData.document_type - Тип документа
   * @param {string} documentData.order_id - ID заказа (опционально)
   * @param {string} documentData.counterparty_id - ID контрагента (опционально)
   * @param {string} documentData.object_id - ID объекта (опционально)
   * @param {string} documentData.document_number - Номер документа
   * @param {string} documentData.document_date - Дата документа
   * @param {number} documentData.amount - Сумма (опционально)
   * @param {string} uploadedBy - ID пользователя, загрузившего документ
   * @returns {Promise<Object>} - Созданный документ
   */
  static async uploadDocument(file, documentData, uploadedBy) {
    const transaction = await db.sequelize.transaction();

    try {
      // Валидация обязательных полей
      if (!documentData.document_type) {
        throw new Error("Тип документа обязателен");
      }

      if (!file || !file.path) {
        throw new Error("Файл не загружен");
      }

      // Проверяем, что связан хотя бы один объект
      if (
        !documentData.order_id &&
        !documentData.counterparty_id &&
        !documentData.object_id
      ) {
        throw new Error(
          "Документ должен быть связан с заказом, контрагентом или объектом",
        );
      }

      // Валидация типа документа
      const validDocumentTypes = [
        "executor_invoice", // Счет от исполнителя
        "executor_payment_confirmation", // Подтверждение оплаты исполнителю
        "client_invoice", // Счет клиенту (из 1С)
        "client_payment_confirmation", // Подтверждение оплаты от клиента
        "contract", // Договор
        "act", // Акт выполненных работ
        "permit", // Разрешение
        "other", // Прочее
      ];

      if (!validDocumentTypes.includes(documentData.document_type)) {
        throw new Error(
          `Недопустимый тип документа. Допустимые типы: ${validDocumentTypes.join(", ")}`,
        );
      }

      // Генерируем уникальное имя файла
      const fileExtension = path.extname(file.originalname);
      const uniqueFileName = `${crypto.randomUUID()}${fileExtension}`;
      const uploadDir = path.join(__dirname, "../uploads/documents");
      const targetPath = path.join(uploadDir, uniqueFileName);

      // Создаем директорию если не существует
      await fs.mkdir(uploadDir, { recursive: true });

      // Перемещаем файл
      await fs.rename(file.path, targetPath);

      // Создаем запись в БД
      const document = await db.Document.create(
        {
          id: crypto.randomUUID(),
          order_id: documentData.order_id || null,
          counterparty_id: documentData.counterparty_id || null,
          object_id: documentData.object_id || null,
          document_type: documentData.document_type,
          file_path: `/uploads/documents/${uniqueFileName}`,
          file_name: file.originalname,
          file_size: file.size,
          mime_type: file.mimetype,
          document_number: documentData.document_number || null,
          document_date: documentData.document_date || null,
          amount: documentData.amount || null,
          status: "active",
          uploaded_by: uploadedBy,
          created_at: new Date(),
          updated_at: new Date(),
        },
        { transaction },
      );

      // Если документ связан с заказом и это счет от исполнителя, обновляем заказ
      if (
        documentData.order_id &&
        documentData.document_type === "executor_invoice"
      ) {
        await db.Order.update(
          {
            executor_invoice_file: document.file_path,
            executor_invoice_number: documentData.document_number,
            executor_invoice_date: documentData.document_date,
            executor_invoice_amount: documentData.amount,
            executor_invoice_status: "received",
            executor_invoice_received_at: new Date(),
          },
          {
            where: { id: documentData.order_id },
            transaction,
          },
        );
      }

      // Если документ связан с заказом и это подтверждение оплаты исполнителю
      if (
        documentData.order_id &&
        documentData.document_type === "executor_payment_confirmation"
      ) {
        await db.Order.update(
          {
            executor_payment_confirm_file: document.file_path,
            executor_invoice_status: "paid",
            executor_paid_at: new Date(),
          },
          {
            where: { id: documentData.order_id },
            transaction,
          },
        );
      }

      await transaction.commit();

      return {
        success: true,
        document: document,
        message: "Документ успешно загружен",
      };
    } catch (error) {
      await transaction.rollback();

      // Удаляем файл если он был перемещен
      if (file && file.path) {
        try {
          await fs.unlink(file.path).catch(() => {});
        } catch (unlinkError) {
          console.error("Ошибка удаления файла:", unlinkError);
        }
      }

      console.error("Ошибка загрузки документа:", error);
      throw error;
    }
  }

  /**
   * Получить документ по ID
   * @param {string} documentId - ID документа
   * @returns {Promise<Object>} - Документ с связанными данными
   */
  // services/DocumentService.js - исправленный метод getDocumentById

  static async getDocumentById(documentId) {
    try {
      const document = await db.Document.findByPk(documentId, {
        include: [
          {
            model: db.User,
            as: "uploader",
            attributes: ["id", "full_name", "email"], // Исправлено: full_name вместо name
          },
          {
            model: db.Order,
            as: "order",
            attributes: ["id", "order_number"],
          },
          {
            model: db.Counterparty,
            as: "counterparty",
            attributes: ["id", "representative_name"], // Исправлено: representative_name вместо name
          },
          {
            model: db.Object,
            as: "object",
            attributes: ["id", "address"], // Убрали name, оставили address
          },
        ],
      });

      if (!document) {
        throw new Error(`Документ с ID ${documentId} не найден`);
      }

      return document;
    } catch (error) {
      console.error("Ошибка получения документа:", error);
      throw error;
    }
  }

  /**
   * Получить документы по фильтрам
   * @param {Object} filters - Фильтры
   * @param {string} filters.order_id - ID заказа
   * @param {string} filters.counterparty_id - ID контрагента
   * @param {string} filters.object_id - ID объекта
   * @param {string} filters.document_type - Тип документа
   * @param {string} filters.status - Статус документа
   * @param {string} filters.date_from - Дата с
   * @param {string} filters.date_to - Дата по
   * @param {number} filters.limit - Лимит записей
   * @param {number} filters.offset - Смещение
   * @returns {Promise<Object>} - Список документов и общее количество
   */
  static async getDocuments(filters = {}) {
    try {
      const whereClause = {};

      if (filters.order_id) {
        whereClause.order_id = filters.order_id;
      }

      if (filters.counterparty_id) {
        whereClause.counterparty_id = filters.counterparty_id;
      }

      if (filters.object_id) {
        whereClause.object_id = filters.object_id;
      }

      if (filters.document_type) {
        whereClause.document_type = filters.document_type;
      }

      if (filters.status) {
        whereClause.status = filters.status;
      }

      if (filters.date_from) {
        whereClause.created_at = {
          [Op.gte]: filters.date_from,
        };
      }

      if (filters.date_to) {
        whereClause.created_at = {
          ...whereClause.created_at,
          [Op.lte]: filters.date_to,
        };
      }

      const limit = filters.limit || 50;
      const offset = filters.offset || 0;

      const { count, rows } = await db.Document.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: db.User,
            as: "uploader",
            attributes: ["id", "name"],
          },
        ],
        order: [["created_at", "DESC"]],
        limit: limit,
        offset: offset,
      });

      return {
        total: count,
        limit: limit,
        offset: offset,
        documents: rows,
      };
    } catch (error) {
      console.error("Ошибка получения списка документов:", error);
      throw error;
    }
  }

  /**
   * Получить документы по заказу с группировкой по типам
   * @param {string} orderId - ID заказа
   * @returns {Promise<Object>} - Документы заказа по типам
   */
  static async getOrderDocuments(orderId) {
    try {
      const documents = await db.Document.findAll({
        where: {
          order_id: orderId,
          status: "active",
        },
        order: [["created_at", "DESC"]],
      });

      // Группируем по типам
      const grouped = {
        executor_invoices: [],
        executor_payments: [],
        client_invoices: [],
        client_payments: [],
        others: [],
      };

      for (const doc of documents) {
        switch (doc.document_type) {
          case "executor_invoice":
            grouped.executor_invoices.push(doc);
            break;
          case "executor_payment_confirmation":
            grouped.executor_payments.push(doc);
            break;
          case "client_invoice":
            grouped.client_invoices.push(doc);
            break;
          case "client_payment_confirmation":
            grouped.client_payments.push(doc);
            break;
          default:
            grouped.others.push(doc);
        }
      }

      return grouped;
    } catch (error) {
      console.error("Ошибка получения документов заказа:", error);
      throw error;
    }
  }

  /**
   * Удалить документ (мягкое удаление)
   * @param {string} documentId - ID документа
   * @param {string} deletedBy - ID пользователя
   * @returns {Promise<Object>} - Результат удаления
   */
  static async deleteDocument(documentId, deletedBy) {
    const transaction = await db.sequelize.transaction();

    try {
      const document = await db.Document.findByPk(documentId);

      if (!document) {
        throw new Error(`Документ с ID ${documentId} не найден`);
      }

      // Мягкое удаление
      await document.update(
        {
          status: "deleted",
          deleted_at: new Date(),
          deleted_by: deletedBy,
        },
        { transaction },
      );

      await transaction.commit();

      return {
        success: true,
        message: "Документ успешно удален",
      };
    } catch (error) {
      await transaction.rollback();
      console.error("Ошибка удаления документа:", error);
      throw error;
    }
  }

  /**
   * Физически удалить файл документа из системы
   * @param {string} documentId - ID документа
   * @returns {Promise<Object>} - Результат удаления
   */
  static async deleteDocumentFile(documentId) {
    try {
      const document = await db.Document.findByPk(documentId);

      if (!document) {
        throw new Error(`Документ с ID ${documentId} не найден`);
      }

      if (document.file_path) {
        const filePath = path.join(__dirname, "..", document.file_path);
        try {
          await fs.unlink(filePath);
        } catch (error) {
          console.error("Ошибка удаления файла:", error);
        }
      }

      return {
        success: true,
        message: "Файл документа удален",
      };
    } catch (error) {
      console.error("Ошибка удаления файла документа:", error);
      throw error;
    }
  }

  /**
   * Обновить информацию о документе
   * @param {string} documentId - ID документа
   * @param {Object} updateData - Данные для обновления
   * @returns {Promise<Object>} - Обновленный документ
   */
  static async updateDocumentInfo(documentId, updateData) {
    try {
      const document = await db.Document.findByPk(documentId);

      if (!document) {
        throw new Error(`Документ с ID ${documentId} не найден`);
      }

      const allowedUpdates = [
        "document_number",
        "document_date",
        "amount",
        "notes",
      ];
      const updateFields = {};

      for (const field of allowedUpdates) {
        if (updateData[field] !== undefined) {
          updateFields[field] = updateData[field];
        }
      }

      updateFields.updated_at = new Date();

      await document.update(updateFields);

      return {
        success: true,
        document: document,
        message: "Информация о документе обновлена",
      };
    } catch (error) {
      console.error("Ошибка обновления документа:", error);
      throw error;
    }
  }

  /**
   * Проверить и очистить неиспользуемые файлы
   * @param {number} daysOld - Возраст файлов в днях
   * @returns {Promise<Object>} - Результат очистки
   */
  static async cleanupOrphanedFiles(daysOld = 7) {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysOld);

      // Находим документы со статусом 'deleted' старше указанного периода
      const deletedDocuments = await db.Document.findAll({
        where: {
          status: "deleted",
          deleted_at: {
            [Op.lt]: thresholdDate,
          },
        },
      });

      let deletedFilesCount = 0;
      let failedFilesCount = 0;

      for (const doc of deletedDocuments) {
        if (doc.file_path) {
          const filePath = path.join(__dirname, "..", doc.file_path);
          try {
            await fs.unlink(filePath);
            deletedFilesCount++;

            // Опционально: удаляем запись из БД после удаления файла
            await doc.destroy();
          } catch (error) {
            console.error(`Ошибка удаления файла ${doc.file_path}:`, error);
            failedFilesCount++;
          }
        }
      }

      return {
        success: true,
        deleted_files: deletedFilesCount,
        failed_files: failedFilesCount,
        message: `Очистка завершена. Удалено файлов: ${deletedFilesCount}`,
      };
    } catch (error) {
      console.error("Ошибка очистки файлов:", error);
      throw error;
    }
  }
}

module.exports = DocumentService;
