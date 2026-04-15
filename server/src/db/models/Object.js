const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  /**
   * Модель Object (Объект / Адрес)
   * Хранит адреса объектов, где оказываются услуги
   */
  const Object = sequelize.define(
    "Object",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: "Уникальный идентификатор объекта",
      },

      counterparty_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "ID контрагента (связь с таблицей counterparties)",
      },

      address: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Адрес объекта (обязательное поле)",
      },

      responsible_person: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Ответственное лицо на объекте (ФИО)",
      },

      responsible_phone: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Контактный номер ответственного лица",
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: "Активен ли объект (true - активен, false - деактивирован)",
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Дополнительные заметки по объекту",
      },

      // Временные метки
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "Дата создания записи",
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: "Дата последнего обновления записи",
      },
    },
    {
      tableName: "objects",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      comment: "Таблица объектов/адресов контрагентов",
    },
  );

  return Object;
};
