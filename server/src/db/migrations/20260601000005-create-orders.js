"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ENUMs
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_orders_status AS ENUM (
          'draft', 'processing', 'assigned', 'in_transit',
          'driver_done', 'paid', 'completed', 'cancelled'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_orders_container_action AS ENUM (
          'install', 'pickup', 'loading', 'replace', 'roll'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_orders_container_volume AS ENUM ('8m3', '20m3', '27m3');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_orders_payment_type AS ENUM (
          'invoice_with_vat', 'invoice_without_vat', 'card_transfer', 'cash'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_orders_payment_format AS ENUM ('single', 'prepaid');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_orders_executor_invoice_status AS ENUM (
          'not_received', 'received', 'verified', 'paid', 'rejected'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_orders_client_payment_status AS ENUM (
          'not_paid', 'partially_paid', 'paid', 'overdue'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_orders_executor_payment_method AS ENUM (
          'invoice_with_vat', 'invoice_without_vat', 'cash', 'card_transfer'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_orders_payment_flow AS ENUM ('direct', 'executor_collects');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      CREATE SEQUENCE IF NOT EXISTS orders_order_number_seq;
    `);

    await queryInterface.createTable("orders", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      order_number: {
        type: Sequelize.INTEGER,
        defaultValue: Sequelize.literal("nextval('orders_order_number_seq')"),
        unique: true,
        allowNull: false,
      },
      status: {
        type: "enum_orders_status",
        defaultValue: "draft",
        allowNull: false,
      },

      // FK relations
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      customer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "counterparties", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      executor_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "counterparties", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      driver_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "drivers", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      related_order_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "orders", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      income_recipient_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      waste_receiver_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "waste_receivers", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      waste_receiver_address_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "waste_receiver_addresses", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },

      // Container data
      container_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      container_action: {
        type: "enum_orders_container_action",
        allowNull: true,
      },
      container_volume: {
        type: "enum_orders_container_volume",
        allowNull: true,
      },
      installed_container_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      picked_up_container_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      // Dates
      install_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      install_duration: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      pickup_reminder_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      loading_time: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      // Address & contacts
      pickup_address: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      customer_phone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      contact_phone: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      // Payment
      payment_type: {
        type: "enum_orders_payment_type",
        allowNull: false,
      },
      client_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      executor_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      commission_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      payment_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      payment_format: {
        type: "enum_orders_payment_format",
        allowNull: true,
      },
      prepaid_deliveries_total: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      prepaid_deliveries_used: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: true,
      },
      payment_confirmation_file: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      executor_payment_method: {
        type: "enum_orders_executor_payment_method",
        allowNull: true,
      },
      client_amount_net: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      executor_amount_net: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      is_loss_acknowledged: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      payment_flow: {
        type: "enum_orders_payment_flow",
        allowNull: false,
        defaultValue: "direct",
      },
      distance_multiplier: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 1.0,
      },

      // Executor invoice
      executor_invoice_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      executor_invoice_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      executor_invoice_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      executor_invoice_file: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      executor_invoice_status: {
        type: "enum_orders_executor_invoice_status",
        allowNull: false,
        defaultValue: "not_received",
      },
      executor_invoice_received_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      executor_paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      executor_payment_confirm_file: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      // Client invoice
      client_invoice_number: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      client_invoice_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      client_invoice_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      client_payment_status: {
        type: "enum_orders_client_payment_status",
        allowNull: false,
        defaultValue: "not_paid",
      },
      client_payment_deadline: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      client_paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      payment_reminder_sent_3days: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      payment_reminder_sent_1day: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      payment_overdue_marked_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      // Driver report
      completion_photo: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      waybill_photo: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      driver_completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      // Notifications
      last_delivery_notified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },

      comments: {
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

    await queryInterface.addIndex("orders", ["order_number"], { unique: true });
    await queryInterface.addIndex("orders", ["status"]);
    await queryInterface.addIndex("orders", ["user_id"]);
    await queryInterface.addIndex("orders", ["customer_id"]);
    await queryInterface.addIndex("orders", ["executor_id"]);
    await queryInterface.addIndex("orders", ["driver_id"]);
    await queryInterface.addIndex("orders", ["related_order_id"]);
    await queryInterface.addIndex("orders", ["install_date"]);
    await queryInterface.addIndex("orders", ["pickup_reminder_date"]);
    await queryInterface.addIndex("orders", ["payment_format"]);
    await queryInterface.addIndex("orders", ["executor_invoice_status"]);
    await queryInterface.addIndex("orders", ["client_payment_status"]);
    await queryInterface.addIndex("orders", ["client_payment_deadline"]);
    await queryInterface.addIndex("orders", ["executor_invoice_number"]);
    await queryInterface.addIndex("orders", ["client_invoice_number"]);
    await queryInterface.addIndex("orders", ["executor_payment_method"]);
    await queryInterface.addIndex("orders", ["income_recipient_user_id"]);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("orders");

    await queryInterface.sequelize.query(`
      DROP SEQUENCE IF EXISTS orders_order_number_seq;
    `);

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_orders_status;
      DROP TYPE IF EXISTS enum_orders_container_action;
      DROP TYPE IF EXISTS enum_orders_container_volume;
      DROP TYPE IF EXISTS enum_orders_payment_type;
      DROP TYPE IF EXISTS enum_orders_payment_format;
      DROP TYPE IF EXISTS enum_orders_executor_invoice_status;
      DROP TYPE IF EXISTS enum_orders_client_payment_status;
      DROP TYPE IF EXISTS enum_orders_executor_payment_method;
      DROP TYPE IF EXISTS enum_orders_payment_flow;
    `);
  },
};
