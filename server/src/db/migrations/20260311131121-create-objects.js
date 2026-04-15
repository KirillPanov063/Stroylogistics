"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Создаем таблицу objects
    await queryInterface.createTable("objects", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: "Уникальный идентификатор объекта",
      },
      counterparty_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "counterparties",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        comment: "ID контрагента (связь с таблицей counterparties)",
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: "Адрес объекта (обязательное поле)",
      },
      responsible_person: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Ответственное лицо на объекте (ФИО)",
      },
      responsible_phone: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Контактный номер ответственного лица",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: "Активен ли объект",
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Дополнительные заметки по объекту",
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
    await queryInterface.addIndex("objects", ["counterparty_id"]);
    await queryInterface.addIndex("objects", ["responsible_phone"]);
    await queryInterface.addIndex("objects", ["is_active"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("objects");
  },
};
