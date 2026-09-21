"use strict";

const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SalaryAccrual = sequelize.define(
    "SalaryAccrual",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: "Уникальный идентификатор начисления",
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "Сотрудник, которому начисляется зарплата",
      },
      order_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "Заказ-основание начисления (null для работы на базе)",
      },
      accrual_type: {
        type: DataTypes.ENUM("order_wage", "base_work"),
        allowNull: false,
        defaultValue: "order_wage",
        comment: "order_wage — оплата за рейс, base_work — работа на базе",
      },
      days_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Количество дней (только для base_work)",
      },
      daily_rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Ставка в день (только для base_work)",
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: "Сумма начисления",
      },
      payment_method: {
        type: DataTypes.ENUM("cash", "card_transfer"),
        allowNull: true,
        comment: "Способ оплаты клиента (null для фиксированной зарплаты водителя)",
      },
      period: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: "Расчётный период (первый день месяца)",
      },
      status: {
        type: DataTypes.ENUM("pending", "paid"),
        allowNull: false,
        defaultValue: "pending",
        comment: "pending — начислено, paid — выплачено",
      },
      paid_at: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Дата выплаты",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Примечание менеджера",
      },
      accrued_by: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "Менеджер, назначивший получателя",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "salary_accruals",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["user_id"] },
        { fields: ["order_id"], unique: true },
        { fields: ["period"] },
        { fields: ["status"] },
      ],
    },
  );

  return SalaryAccrual;
};
