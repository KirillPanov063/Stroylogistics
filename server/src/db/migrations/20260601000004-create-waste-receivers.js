"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // waste_receivers
    await queryInterface.createTable("waste_receivers", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      person_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "llc",
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      representative_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      contract_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      contract_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      price_per_m3: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      price_history: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("waste_receivers", ["name"]);
    await queryInterface.addIndex("waste_receivers", ["is_active"]);

    // waste_receiver_addresses
    await queryInterface.createTable("waste_receiver_addresses", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      waste_receiver_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "waste_receivers", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      contact_person: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      contact_phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      working_hours: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("waste_receiver_addresses", ["waste_receiver_id"]);
    await queryInterface.addIndex("waste_receiver_addresses", ["is_active"]);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("waste_receiver_addresses");
    await queryInterface.dropTable("waste_receivers");
  },
};
