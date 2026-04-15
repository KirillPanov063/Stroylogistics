"use strict";
const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Получаем ID контрагентов из БД
    const [counterparties] = await queryInterface.sequelize.query(
      `SELECT id, person_type FROM counterparties WHERE person_type IN ('llc', 'entrepreneur') LIMIT 3;`,
    );

    if (counterparties.length < 2) {
      console.log("Недостаточно контрагентов для создания реквизитов");
      return;
    }

    // Создаем реквизиты для ООО "Ромашка" (клиент)
    await queryInterface.bulkInsert("company_details", [
      {
        id: uuidv4(),
        counterparty_id: counterparties[0].id,
        full_name_org: 'Общество с ограниченной ответственностью "Ромашка"',
        short_name_org: 'ООО "Ромашка"',
        legal_address: "г. Москва, ул. Ленина, д. 1, офис 101",
        postal_address: "г. Москва, ул. Ленина, д. 1, офис 101",
        location: "г. Москва",
        manager_position: "Генеральный директор",
        manager_full_name: "Иванов Иван Иванович",
        bank_name: "ПАО Сбербанк",
        checking_account: "40702810940000000250",
        correspondent_account: "30101810400000000225",
        bic: "044525225",
        inn: "7701234567",
        kpp: "770101001",
        ogrn: "1234567890123",
        service_types: "{}", // Исправлено: пустой массив в формате PostgreSQL
        contract_number: null,
        contract_date: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        counterparty_id: counterparties[1].id,
        full_name_org: 'ООО "СтройСервис"',
        short_name_org: 'ООО "СтройСервис"',
        legal_address: "г. Москва, ул. Строителей, д. 10",
        postal_address: "г. Москва, ул. Строителей, д. 10",
        location: "г. Москва",
        manager_position: "Директор",
        manager_full_name: "Козлов Михаил Петрович",
        bank_name: "АО Тинькофф Банк",
        checking_account: "40802810640000000333",
        correspondent_account: "30101810600000000333",
        bic: "044525333",
        inn: "7702123456",
        kpp: "770201001",
        ogrn: "1234567890456",
        service_types: "{removal,replacement}", // Исправлено: массив значений в формате PostgreSQL
        contract_number: "Д-2024-001",
        contract_date: "2024-01-15",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("company_details", null, {});
  },
};
