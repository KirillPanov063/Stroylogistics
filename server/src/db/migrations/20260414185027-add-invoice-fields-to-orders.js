"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Добавляем поля для счетов от исполнителей
    await queryInterface.addColumn("orders", "executor_invoice_number", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("orders", "executor_invoice_date", {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await queryInterface.addColumn("orders", "executor_invoice_amount", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.addColumn("orders", "executor_invoice_file", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("orders", "executor_invoice_status", {
      type: Sequelize.ENUM(
        "not_received",
        "received",
        "verified",
        "paid",
        "rejected",
      ),
      defaultValue: "not_received",
      allowNull: false,
    });

    await queryInterface.addColumn("orders", "executor_invoice_received_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("orders", "executor_paid_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("orders", "executor_payment_confirm_file", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Добавляем поля для счетов клиентам
    await queryInterface.addColumn("orders", "client_invoice_number", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("orders", "client_invoice_date", {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await queryInterface.addColumn("orders", "client_invoice_amount", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.addColumn("orders", "client_payment_status", {
      type: Sequelize.ENUM("not_paid", "partially_paid", "paid", "overdue"),
      defaultValue: "not_paid",
      allowNull: false,
    });

    await queryInterface.addColumn("orders", "client_payment_deadline", {
      type: Sequelize.DATEONLY,
      allowNull: true,
    });

    await queryInterface.addColumn("orders", "client_paid_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Добавляем поля для напоминаний
    await queryInterface.addColumn("orders", "payment_reminder_sent_3days", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });

    await queryInterface.addColumn("orders", "payment_reminder_sent_1day", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });

    await queryInterface.addColumn("orders", "payment_overdue_marked_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Удаляем поля для счетов от исполнителей
    await queryInterface.removeColumn("orders", "executor_invoice_number");
    await queryInterface.removeColumn("orders", "executor_invoice_date");
    await queryInterface.removeColumn("orders", "executor_invoice_amount");
    await queryInterface.removeColumn("orders", "executor_invoice_file");
    await queryInterface.removeColumn("orders", "executor_invoice_status");
    await queryInterface.removeColumn("orders", "executor_invoice_received_at");
    await queryInterface.removeColumn("orders", "executor_paid_at");
    await queryInterface.removeColumn(
      "orders",
      "executor_payment_confirm_file",
    );

    // Удаляем поля для счетов клиентам
    await queryInterface.removeColumn("orders", "client_invoice_number");
    await queryInterface.removeColumn("orders", "client_invoice_date");
    await queryInterface.removeColumn("orders", "client_invoice_amount");
    await queryInterface.removeColumn("orders", "client_payment_status");
    await queryInterface.removeColumn("orders", "client_payment_deadline");
    await queryInterface.removeColumn("orders", "client_paid_at");

    // Удаляем поля для напоминаний
    await queryInterface.removeColumn("orders", "payment_reminder_sent_3days");
    await queryInterface.removeColumn("orders", "payment_reminder_sent_1day");
    await queryInterface.removeColumn("orders", "payment_overdue_marked_at");

    // Удаляем ENUM типы
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS enum_orders_executor_invoice_status;`,
    );
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS enum_orders_client_payment_status;`,
    );
  },
};
