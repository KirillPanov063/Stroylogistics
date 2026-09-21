"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ENUMs
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

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_relationships_relationship_type AS ENUM ('service_provider', 'subcontractor');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // counterparties
    await queryInterface.createTable("counterparties", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      counterparty_type: {
        type: "enum_counterparties_counterparty_type",
        allowNull: false,
        defaultValue: "client",
      },
      person_type: {
        type: "enum_counterparties_person_type",
        allowNull: false,
      },
      representative_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      representative_phone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      default_prices: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {
          invoice_with_vat: { "8m3": 14500, "20m3": 30000, "27m3": 35000 },
          invoice_without_vat: { "8m3": 12000, "20m3": 25000, "27m3": 29000 },
          card_transfer: { "8m3": 13500, "20m3": 28000, "27m3": 32000 },
          cash: { "8m3": 13500, "20m3": 28000, "27m3": 32000 },
          default_payment_type: "invoice_with_vat",
        },
      },
      price_history: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      },
      default_payment_type: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: "invoice_with_vat",
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

    await queryInterface.addIndex("counterparties", ["representative_phone"]);
    await queryInterface.addIndex("counterparties", ["email"]);
    await queryInterface.addIndex("counterparties", ["counterparty_type"]);
    await queryInterface.addIndex("counterparties", ["person_type"]);

    // company_details
    await queryInterface.createTable("company_details", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      counterparty_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: "counterparties", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      full_name_org: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      short_name_org: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      legal_address: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      postal_address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      location: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      manager_position: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      manager_full_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      bank_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      checking_account: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      correspondent_account: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      bic: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      inn: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      kpp: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ogrn: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      service_types: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
      },
      contract_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      contract_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
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

    await queryInterface.addIndex("company_details", ["inn"]);
    await queryInterface.addIndex("company_details", ["short_name_org"]);

    // objects
    await queryInterface.createTable("objects", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      counterparty_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "counterparties", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      responsible_person: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      responsible_phone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    await queryInterface.addIndex("objects", ["counterparty_id"]);
    await queryInterface.addIndex("objects", ["responsible_phone"]);
    await queryInterface.addIndex("objects", ["is_active"]);

    // relationships
    await queryInterface.createTable("relationships", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      client_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "counterparties", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      executor_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "counterparties", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      relationship_type: {
        type: "enum_relationships_relationship_type",
        allowNull: false,
        defaultValue: "service_provider",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      contract_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      contract_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    await queryInterface.addIndex("relationships", ["client_id", "executor_id"], {
      unique: true,
      name: "unique_client_executor",
    });
    await queryInterface.addIndex("relationships", ["executor_id"]);
    await queryInterface.addIndex("relationships", ["relationship_type"]);
    await queryInterface.addIndex("relationships", ["is_active"]);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("relationships");
    await queryInterface.dropTable("objects");
    await queryInterface.dropTable("company_details");
    await queryInterface.dropTable("counterparties");

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_relationships_relationship_type;
      DROP TYPE IF EXISTS enum_counterparties_counterparty_type;
      DROP TYPE IF EXISTS enum_counterparties_person_type;
    `);
  },
};
