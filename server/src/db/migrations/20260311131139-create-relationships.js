"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Создаем ENUM для relationship_type
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_relationships_relationship_type AS ENUM ('service_provider', 'subcontractor');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Создаем таблицу relationships
    await queryInterface.createTable("relationships", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: "Уникальный идентификатор связи",
      },
      client_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "counterparties",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        comment: "ID клиента (связь с таблицей counterparties)",
      },
      executor_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "counterparties",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        comment: "ID исполнителя (связь с таблицей counterparties)",
      },
      relationship_type: {
        type: "enum_relationships_relationship_type",
        allowNull: false,
        defaultValue: "service_provider",
        comment:
          "Тип связи: service_provider (поставщик услуг), subcontractor (субподрядчик)",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: "Активна ли связь",
      },
      contract_number: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Номер договора между клиентом и исполнителем",
      },
      contract_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: "Дата договора",
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Дополнительные заметки по связи",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        comment: "Дата создания записи",
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        comment: "Дата последнего обновления записи",
      },
    });

    // Добавляем уникальный индекс для пары клиент-исполнитель
    await queryInterface.addIndex(
      "relationships",
      ["client_id", "executor_id"],
      {
        unique: true,
        name: "unique_client_executor",
      },
    );

    // Добавляем остальные индексы
    await queryInterface.addIndex("relationships", ["client_id"]);
    await queryInterface.addIndex("relationships", ["executor_id"]);
    await queryInterface.addIndex("relationships", ["relationship_type"]);
    await queryInterface.addIndex("relationships", ["is_active"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("relationships");
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_relationships_relationship_type;
    `);
  },
};
