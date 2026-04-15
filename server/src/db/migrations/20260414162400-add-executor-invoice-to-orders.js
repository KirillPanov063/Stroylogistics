"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Добавляем поле invoice_from_executor (JSONB)
    await queryInterface.addColumn("orders", "invoice_from_executor", {
      type: Sequelize.JSONB,
      defaultValue: null,
      allowNull: true,
      comment: "Данные счета от исполнителя",
    });

    // Добавляем поле invoice_from_executor_status
    await queryInterface.addColumn("orders", "invoice_from_executor_status", {
      type: "enum_invoice_from_executor_status",
      defaultValue: "not_received",
      allowNull: true,
      comment: "Статус счета от исполнителя",
    });

    // Добавляем поле invoice_from_executor_date
    await queryInterface.addColumn("orders", "invoice_from_executor_date", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Дата получения счета от исполнителя",
    });

    // Добавляем поле invoice_from_executor_file
    await queryInterface.addColumn("orders", "invoice_from_executor_file", {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Путь к файлу счета от исполнителя",
    });

    // Добавляем поле invoice_number (номер счета от исполнителя)
    await queryInterface.addColumn("orders", "invoice_number", {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Номер счета от исполнителя",
    });

    // Добавляем поле payment_due_date (срок оплаты от клиента)
    await queryInterface.addColumn("orders", "payment_due_date", {
      type: Sequelize.DATE,
      allowNull: true,
      comment: "Срок оплаты счета клиентом",
    });

    // Добавляем поле payment_status (статус оплаты от клиента)
    await queryInterface.addColumn("orders", "payment_status", {
      type: "enum_payment_status",
      defaultValue: "pending",
      allowNull: true,
      comment: "Статус оплаты счета клиентом",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("orders", "invoice_from_executor");
    await queryInterface.removeColumn("orders", "invoice_from_executor_status");
    await queryInterface.removeColumn("orders", "invoice_from_executor_date");
    await queryInterface.removeColumn("orders", "invoice_from_executor_file");
    await queryInterface.removeColumn("orders", "invoice_number");
    await queryInterface.removeColumn("orders", "payment_due_date");
    await queryInterface.removeColumn("orders", "payment_status");
  },
};
