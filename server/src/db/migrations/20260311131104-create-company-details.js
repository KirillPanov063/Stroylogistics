"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Создаем таблицу company_details
    await queryInterface.createTable("company_details", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        comment: "Уникальный идентификатор реквизитов",
      },
      counterparty_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: "counterparties",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
        comment: "ID контрагента (связь с таблицей counterparties)",
      },
      full_name_org: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Полное наименование организации (необязательное поле)",
      },
      short_name_org: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Краткое наименование организации (обязательное поле)",
      },
      legal_address: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: "Юридический адрес (обязательное поле)",
      },
      postal_address: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Почтовый адрес (необязательное поле)",
      },
      location: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Местонахождение (необязательное поле)",
      },
      manager_position: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Должность руководителя (обязательное поле)",
      },
      manager_full_name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "ФИО руководителя (обязательное поле)",
      },
      bank_name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Полное наименование банка (обязательное поле)",
      },
      checking_account: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Расчетный счет (20 цифр)",
      },
      correspondent_account: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "Корреспондентский счет (20 цифр)",
      },
      bic: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "БИК банка (9 цифр)",
      },
      inn: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "ИНН (для ЮЛ - 10 цифр, для ИП - 10-15 цифр)",
      },
      kpp: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "КПП (9 цифр, для ЮЛ обязательно, для ИП необязательно)",
      },
      ogrn: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "ОГРН (13 цифр) или ОГРНИП (15 цифр)",
      },
      service_types: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        defaultValue: [],
        comment: "Виды услуг, которые оказывает исполнитель (массив)",
      },
      contract_number: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: "Номер договора с исполнителем",
      },
      contract_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: "Дата договора с исполнителем",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        comment: "Дата создания записи",
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        comment: "Дата последнего обновления записи",
      },
    });

    // Добавляем индексы
    await queryInterface.addIndex("company_details", ["counterparty_id"]);
    await queryInterface.addIndex("company_details", ["inn"]);
    await queryInterface.addIndex("company_details", ["short_name_org"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("company_details");
  },
};
