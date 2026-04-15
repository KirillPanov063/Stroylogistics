// models/Document.js

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Document = sequelize.define(
    "Document",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: "Уникальный идентификатор документа",
      },

      // Связи
      order_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "orders",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        comment: "ID связанного заказа",
      },

      counterparty_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "counterparties",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        comment: "ID связанного контрагента",
      },

      object_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "objects",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
        comment: "ID связанного объекта",
      },

      parent_document_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "documents",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
        comment: "ID родительского документа (для версионирования)",
      },

      // Тип документа - ИСПРАВЛЕНО: используем STRING вместо ENUM
      document_type: {
        type: DataTypes.STRING, // ✅ Изменено с ENUM на STRING
        allowNull: false,
        comment: "Тип документа",
      },

      // Информация о файле
      file_url: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Путь к файлу документа",
      },

      file_name: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Оригинальное имя файла",
      },

      file_size: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: "Размер файла в байтах",
      },

      mime_type: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "MIME тип файла",
      },

      // Данные документа
      document_number: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Номер документа",
      },

      document_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Дата документа",
      },

      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Сумма документа (для счетов)",
      },

      vat_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Сумма НДС",
      },

      // Статус документа - тоже меняем на STRING
      status: {
        type: DataTypes.STRING, // ✅ Изменено с ENUM на STRING
        defaultValue: "active",
        allowNull: false,
        comment: "Статус документа",
      },

      // Метаданные
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: "Дополнительные метаданные документа",
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Примечания к документу",
      },

      // Даты верификации и оплаты
      verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Дата верификации документа",
      },

      paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Дата оплаты по документу",
      },

      // Пользователи
      created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
        comment: "ID пользователя, создавшего запись",
      },

      uploaded_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
        comment: "ID пользователя, загрузившего файл документа",
      },

      deleted_by: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "ID пользователя, удалившего документ",
      },

      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Дата удаления документа",
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "Дата создания записи",
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "Дата последнего обновления",
      },
    },
    {
      tableName: "documents",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          fields: ["order_id"],
        },
        {
          fields: ["counterparty_id"],
        },
        {
          fields: ["object_id"],
        },
        {
          fields: ["document_type"],
        },
        {
          fields: ["document_number"],
        },
        {
          fields: ["status"],
        },
        {
          fields: ["uploaded_by"],
        },
        {
          fields: ["created_by"],
        },
        {
          fields: ["parent_document_id"],
        },
      ],
    },
  );

  return Document;
};
