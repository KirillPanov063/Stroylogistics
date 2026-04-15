"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Создаем ENUM типы
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_counterparties_counterparty_type AS ENUM ('client', 'executor', 'both');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_counterparties_person_type AS ENUM ('individual', 'llc', 'entrepreneur');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Создаем таблицу counterparties
    await queryInterface.createTable("counterparties", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: "Уникальный идентификатор контрагента",
      },
      counterparty_type: {
        type: "enum_counterparties_counterparty_type",
        allowNull: false,
        defaultValue: "client",
        comment:
          "Тип контрагента: client (клиент), executor (исполнитель), both (и клиент и исполнитель)",
      },
      person_type: {
        type: "enum_counterparties_person_type",
        allowNull: false,
        comment: "Тип лица: individual (физлицо), llc (ООО), entrepreneur (ИП)",
      },
      representative_name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Представитель / Заказчик (ФИО или название)",
      },
      representative_phone: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Контактный номер представителя",
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Email адрес",
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Общий телефон организации",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: "Активен ли контрагент",
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

    // Добавляем индексы
    await queryInterface.addIndex("counterparties", ["representative_phone"]);
    await queryInterface.addIndex("counterparties", ["email"]);
    await queryInterface.addIndex("counterparties", ["counterparty_type"]);
    await queryInterface.addIndex("counterparties", ["person_type"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("counterparties");

    // Удаляем ENUM типы
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_counterparties_counterparty_type;
    `);
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_counterparties_person_type;
    `);
  },
};
