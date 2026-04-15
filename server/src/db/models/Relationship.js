const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  /**
   * Модель Relationship (Связи между контрагентами)
   * Хранит информацию о том, какие исполнители работают с какими клиентами
   */
  const Relationship = sequelize.define(
    "Relationship",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: "Уникальный идентификатор связи",
      },

      client_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "ID клиента (связь с таблицей counterparties)",
      },

      executor_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "ID исполнителя (связь с таблицей counterparties)",
      },

      relationship_type: {
        type: DataTypes.ENUM("service_provider", "subcontractor"),
        allowNull: false,
        defaultValue: "service_provider",
        comment:
          "Тип связи: service_provider (поставщик услуг), subcontractor (субподрядчик)",
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: "Активна ли связь",
      },

      contract_number: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Номер договора между клиентом и исполнителем",
      },

      contract_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Дата договора",
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Дополнительные заметки по связи",
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
      tableName: "relationships",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      comment: "Таблица связей между клиентами и исполнителями",
      indexes: [
        {
          unique: true,
          fields: ["client_id", "executor_id"],
          name: "unique_client_executor",
        },
      ],
    },
  );

  return Relationship;
};
