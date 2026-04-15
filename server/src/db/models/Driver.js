const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Driver = sequelize.define(
    "Driver",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: "Уникальный идентификатор водителя",
      },

      // Основная информация
      full_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        comment: "Полное имя водителя",
      },

      phone: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
        comment: "Контактный телефон водителя",
      },

      driver_type: {
        type: DataTypes.ENUM("company", "external"),
        allowNull: false,
        defaultValue: "company",
        comment: "Тип водителя: company (штатный), external (внешний)",
      },

      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
        comment: "ID пользователя системы (если водитель зарегистрирован)",
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: "Активен ли водитель",
      },

      // ============= ДАННЫЕ АВТОМОБИЛЯ =============

      vehicle_license_plate: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Государственный номер автомобиля (например: А123ВВ777)",
      },

      vehicle_model: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Марка и модель автомобиля (например: ГАЗель NEXT)",
      },

      vehicle_year: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 1900,
          max: new Date().getFullYear() + 1,
        },
        comment: "Год выпуска автомобиля",
      },

      // ============= ТЕХНИЧЕСКИЙ ОСМОТР =============

      inspection_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Дата прохождения последнего технического осмотра",
      },

      next_inspection_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Дата следующего обязательного технического осмотра",
      },

      // ============= ПРОПУСК НА ВЪЕЗД =============

      permit_valid_from: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Дата начала действия пропуска",
      },

      permit_valid_until: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Дата окончания действия пропуска",
      },

      // ============= СТРАХОВКА =============

      insurance_valid_from: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Дата начала действия страховки",
      },

      insurance_valid_until: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Дата окончания действия страховки",
      },

      // ============= УВЕДОМЛЕНИЯ =============

      inspection_notified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Было ли отправлено уведомление о предстоящем техосмотре",
      },

      permit_notified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Было ли отправлено уведомление об истечении пропуска",
      },

      insurance_notified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: "Было ли отправлено уведомление об истечении страховки",
      },

      last_notification_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Дата последнего отправленного уведомления",
      },

      // ============= ВРЕМЕННЫЕ МЕТКИ =============

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
        comment: "Дата последнего обновления",
      },
    },
    {
      tableName: "drivers",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          fields: ["phone"],
        },
        {
          fields: ["driver_type"],
        },
        {
          fields: ["is_active"],
        },
        {
          fields: ["vehicle_license_plate"],
        },
        {
          fields: ["next_inspection_date"],
        },
        {
          fields: ["permit_valid_until"],
        },
        {
          fields: ["insurance_valid_until"],
        },
      ],
    },
  );

  return Driver;
};
