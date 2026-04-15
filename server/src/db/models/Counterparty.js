const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  /**
   * Модель Counterparty (Контрагент)
   * Объединяет клиентов и исполнителей в одной таблице
   */
  const Counterparty = sequelize.define(
    "Counterparty",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: "Уникальный идентификатор контрагента",
      },

      // Тип контрагента
      counterparty_type: {
        type: DataTypes.ENUM("client", "executor", "both"),
        allowNull: false,
        defaultValue: "client",
        comment:
          "Тип контрагента: client (клиент), executor (исполнитель), both (и клиент и исполнитель)",
      },

      // Тип лица
      person_type: {
        type: DataTypes.ENUM("individual", "llc", "entrepreneur"),
        allowNull: false,
        comment: "Тип лица: individual (физлицо), llc (ООО), entrepreneur (ИП)",
      },

      // Основные контактные данные
      representative_name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Представитель / Заказчик (ФИО или название)",
      },

      representative_phone: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Контактный номер представителя",
      },

      email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isEmail: true,
        },
        comment: "Email адрес",
      },

      phone: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Общий телефон организации (необязательный)",
      },

      // ============= НОВЫЕ ПОЛЯ ДЛЯ ЦЕН =============

      // Цены по умолчанию для клиента
      default_prices: {
        type: DataTypes.JSONB,
        defaultValue: {
          invoice_with_vat: {
            "8m3": 14500,
            "20m3": 30000,
            "27m3": 35000,
          },
          invoice_without_vat: {
            "8m3": 12000,
            "20m3": 25000,
            "27m3": 29000,
          },
          cash_card: {
            "8m3": 13500,
            "20m3": 28000,
            "27m3": 32000,
          },
          default_payment_type: "invoice_with_vat",
        },
        allowNull: true,
        comment: "Цены по умолчанию для клиента для разных типов оплаты",
      },

      // История изменения цен
      price_history: {
        type: DataTypes.JSONB,
        defaultValue: [],
        allowNull: true,
        comment: "История изменения цен",
      },

      // Тип оплаты по умолчанию
      default_payment_type: {
        type: DataTypes.STRING,
        defaultValue: "invoice_with_vat",
        allowNull: true,
        comment: "Тип оплаты по умолчанию",
      },

      // Статус
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment:
          "Активен ли контрагент (true - активен, false - деактивирован)",
      },

      // Временные метки
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
        comment: "Дата последнего обновления записи",
      },
    },
    {
      tableName: "counterparties",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      comment: "Таблица контрагентов (клиенты и исполнители)",
    },
  );

  return Counterparty;
};
