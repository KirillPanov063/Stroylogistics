"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("documents", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      order_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "orders", key: "id" },
        onDelete: "CASCADE",
      },
      document_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      file_url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      file_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      mime_type: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      document_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      document_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      vat_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: "active",
        allowNull: false,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      uploaded_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
      },
      deleted_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex("documents", ["order_id"]);
    await queryInterface.addIndex("documents", ["document_type"]);
    await queryInterface.addIndex("documents", ["status"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("documents");
  },
};
