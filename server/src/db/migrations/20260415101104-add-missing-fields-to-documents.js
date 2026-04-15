"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Добавляем поле counterparty_id
    try {
      await queryInterface.addColumn("documents", "counterparty_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "counterparties", key: "id" },
        onDelete: "CASCADE",
      });
      console.log("✅ Добавлено поле counterparty_id");
    } catch (e) {
      if (e.message.includes("already exists")) {
        console.log("⚠️ Поле counterparty_id уже существует");
      } else {
        throw e;
      }
    }

    // Добавляем поле object_id
    try {
      await queryInterface.addColumn("documents", "object_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "objects", key: "id" },
        onDelete: "SET NULL",
      });
      console.log("✅ Добавлено поле object_id");
    } catch (e) {
      if (e.message.includes("already exists")) {
        console.log("⚠️ Поле object_id уже существует");
      } else {
        throw e;
      }
    }

    // Добавляем поле parent_document_id
    try {
      await queryInterface.addColumn("documents", "parent_document_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "documents", key: "id" },
        onDelete: "SET NULL",
      });
      console.log("✅ Добавлено поле parent_document_id");
    } catch (e) {
      if (e.message.includes("already exists")) {
        console.log("⚠️ Поле parent_document_id уже существует");
      } else {
        throw e;
      }
    }

    // Индексы
    try {
      await queryInterface.addIndex("documents", ["counterparty_id"]);
      await queryInterface.addIndex("documents", ["object_id"]);
      await queryInterface.addIndex("documents", ["parent_document_id"]);
      console.log("✅ Добавлены индексы");
    } catch (e) {
      console.log("⚠️ Индексы уже существуют");
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("documents", "counterparty_id");
    await queryInterface.removeColumn("documents", "object_id");
    await queryInterface.removeColumn("documents", "parent_document_id");
    console.log("✅ Поля удалены");
  },
};
