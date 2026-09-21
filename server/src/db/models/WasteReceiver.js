const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const WasteReceiver = sequelize.define(
    "WasteReceiver",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Название компании-приёмщика",
      },
      person_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "llc",
        comment: "Всегда ООО",
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      representative_name: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "ФИО контактного лица",
      },
      contract_number: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Номер договора",
      },
      contract_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Дата договора",
      },
      price_per_m3: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: "Текущая стоимость сдачи за 1 м³",
      },
      price_history: {
        type: DataTypes.JSONB,
        defaultValue: [],
        comment: "История изменений цены: [{price_per_m3, changed_at, changed_by, note}]",
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
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
      tableName: "waste_receivers",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return WasteReceiver;
};
