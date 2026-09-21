"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_salary_accruals_payment_method AS ENUM ('cash', 'card_transfer');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_salary_accruals_status AS ENUM ('pending', 'paid');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_salary_accruals_accrual_type AS ENUM ('order_wage', 'base_work');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryInterface.createTable("salary_accruals", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      order_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "orders", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
      },
      accrual_type: {
        type: "enum_salary_accruals_accrual_type",
        allowNull: false,
        defaultValue: "order_wage",
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      payment_method: {
        type: "enum_salary_accruals_payment_method",
        allowNull: true,
      },
      period: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      status: {
        type: "enum_salary_accruals_status",
        allowNull: false,
        defaultValue: "pending",
      },
      paid_at: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      days_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      daily_rate: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      accrued_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
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

    await queryInterface.addIndex("salary_accruals", ["user_id"]);
    await queryInterface.addIndex("salary_accruals", ["order_id"], { unique: true });
    await queryInterface.addIndex("salary_accruals", ["period"]);
    await queryInterface.addIndex("salary_accruals", ["status"]);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("salary_accruals");

    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_salary_accruals_accrual_type;
      DROP TYPE IF EXISTS enum_salary_accruals_payment_method;
      DROP TYPE IF EXISTS enum_salary_accruals_status;
    `);
  },
};
