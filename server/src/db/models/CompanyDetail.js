const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  /**
   * Модель CompanyDetail (Реквизиты компании)
   * Хранит расширенные реквизиты для юридических лиц и ИП
   */
  const CompanyDetail = sequelize.define(
    "CompanyDetail",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: "Уникальный идентификатор реквизитов",
      },

      counterparty_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        comment: "ID контрагента (связь с таблицей counterparties)",
      },

      // Наименования организации
      full_name_org: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Полное наименование организации (необязательное поле)",
      },

      short_name_org: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Краткое наименование организации (обязательное поле)",
      },

      // Адреса
      legal_address: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "Юридический адрес (обязательное поле)",
      },

      postal_address: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Почтовый адрес (необязательное поле)",
      },

      location: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Местонахождение (необязательное поле)",
      },

      // Руководитель
      manager_position: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Должность руководителя (обязательное поле)",
      },

      manager_full_name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "ФИО руководителя (обязательное поле)",
      },

      // Банковские реквизиты
      bank_name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Полное наименование банка (обязательное поле)",
      },

      checking_account: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          is: /^\d{20}$/,
        },
        comment: "Расчетный счет (20 цифр, обязательное поле)",
      },

      correspondent_account: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          is: /^\d{20}$/,
        },
        comment: "Корреспондентский счет (20 цифр, обязательное поле)",
      },

      bic: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          is: /^\d{9}$/,
        },
        comment: "БИК банка (9 цифр, обязательное поле)",
      },

      // Налоговые реквизиты
      inn: {
        type: DataTypes.STRING,
        allowNull: false,
        comment:
          "ИНН (для ЮЛ - 10 цифр, для ИП - 10-15 цифр, обязательное поле)",
      },

      kpp: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "КПП (9 цифр, для ЮЛ обязательно, для ИП необязательно)",
      },

      ogrn: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "ОГРН (13 цифр) или ОГРНИП (15 цифр)",
      },

      // Для исполнителей
      service_types: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        comment: "Виды услуг, которые оказывает исполнитель (массив)",
      },

      contract_number: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Номер договора с исполнителем",
      },

      contract_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Дата договора с исполнителем",
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
      tableName: "company_details",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      comment: "Таблица с реквизитами компаний (для ЮЛ и ИП)",
    },
  );

  return CompanyDetail;
};
