"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Добавляем поле default_prices (JSONB)
    await queryInterface.addColumn("counterparties", "default_prices", {
      type: Sequelize.JSONB,
      defaultValue: {
        invoice_with_vat: {
          "8m3": 14500,
          "20m3": 30000,
          "27m3": 35000,
        },
        invoice_without_vat: {
          "8m3": 12000,
          "20m3": 25000,
          "27m3": 29000,
        },
        cash_card: {
          "8m3": 13500,
          "20m3": 28000,
          "27m3": 32000,
        },
        default_payment_type: "invoice_with_vat",
      },
      allowNull: true,
      comment: "Цены по умолчанию для клиента для разных типов оплаты",
    });

    // Добавляем поле price_history (JSONB)
    await queryInterface.addColumn("counterparties", "price_history", {
      type: Sequelize.JSONB,
      defaultValue: [],
      allowNull: true,
      comment: "История изменения цен",
    });

    // Добавляем поле default_payment_type (STRING)
    await queryInterface.addColumn("counterparties", "default_payment_type", {
      type: Sequelize.STRING,
      defaultValue: "invoice_with_vat",
      allowNull: true,
      comment: "Тип оплаты по умолчанию",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("counterparties", "default_prices");
    await queryInterface.removeColumn("counterparties", "price_history");
    await queryInterface.removeColumn("counterparties", "default_payment_type");
  },
};
