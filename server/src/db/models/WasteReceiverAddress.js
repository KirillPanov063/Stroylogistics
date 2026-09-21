const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const WasteReceiverAddress = sequelize.define(
    "WasteReceiverAddress",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      waste_receiver_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "waste_receivers", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Адрес полигона/площадки",
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Название площадки",
      },
      contact_person: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      contact_phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      working_hours: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Часы работы, например: 08:00-18:00",
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
      tableName: "waste_receiver_addresses",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return WasteReceiverAddress;
};
