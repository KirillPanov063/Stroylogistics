"use strict";
const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Создаем UUID для контрагентов
    const counterparty1Id = uuidv4(); // ООО "Ромашка" (клиент)
    const counterparty2Id = uuidv4(); // Петров П.П. (исполнитель - физлицо)
    const counterparty3Id = uuidv4(); // Сидоров С.С. (both - предприниматель)
    const counterparty4Id = uuidv4(); // Смирнова Е.В. (клиент - физлицо)
    const counterparty5Id = uuidv4(); // ООО "СтройСервис" (исполнитель - ООО)

    // Дополнительные исполнители для тестов заказов
    const executor1Id = uuidv4(); // ИП "ТехноСервис" (исполнитель)
    const executor2Id = uuidv4(); // ООО "Логистика" (исполнитель)
    const executor3Id = uuidv4(); // Физлицо-исполнитель

    await queryInterface.bulkInsert("counterparties", [
      // ============= КЛИЕНТЫ =============
      {
        id: counterparty1Id,
        counterparty_type: "client",
        person_type: "llc",
        representative_name: "Иванов Иван Иванович (директор)",
        representative_phone: "+79261111111",
        email: "ooo-romashka@example.com",
        phone: "+74951111111",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: counterparty4Id,
        counterparty_type: "client",
        person_type: "individual",
        representative_name: "Смирнова Елена Владимировна",
        representative_phone: "+79264444444",
        email: "smirnova@example.com",
        phone: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // ============= ИСПОЛНИТЕЛИ =============
      {
        id: counterparty2Id,
        counterparty_type: "executor",
        person_type: "individual",
        representative_name: "Петров Петр Петрович",
        representative_phone: "+79262222222",
        email: "petrov@example.com",
        phone: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: counterparty5Id,
        counterparty_type: "executor",
        person_type: "llc",
        representative_name: "Козлов Михаил Петрович (директор)",
        representative_phone: "+79265555555",
        email: "ooo-stroyservice@example.com",
        phone: "+74952222222",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: executor1Id,
        counterparty_type: "executor",
        person_type: "entrepreneur",
        representative_name: "ИП ТехноСервис",
        representative_phone: "+79266666666",
        email: "tehnoservice@example.com",
        phone: "+74953333333",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: executor2Id,
        counterparty_type: "executor",
        person_type: "llc",
        representative_name: "ООО Логистика",
        representative_phone: "+79267777777",
        email: "logistika@example.com",
        phone: "+74954444444",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: executor3Id,
        counterparty_type: "executor",
        person_type: "individual",
        representative_name: "Сергеев Сергей Сергеевич",
        representative_phone: "+79268888888",
        email: "sergeev@example.com",
        phone: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },

      // ============= КОНТРАГЕНТ, КОТОРЫЙ МОЖЕТ БЫТЬ И КЛИЕНТОМ, И ИСПОЛНИТЕЛЕМ =============
      {
        id: counterparty3Id,
        counterparty_type: "both",
        person_type: "entrepreneur",
        representative_name: "Сидоров Сидор Сидорович",
        representative_phone: "+79263333333",
        email: "sidorov@example.com",
        phone: "+79263333333",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Сохраняем ID для использования в следующих сидах
    return {
      counterparty1Id, // клиент ООО "Ромашка"
      counterparty2Id, // исполнитель Петров П.П.
      counterparty3Id, // both Сидоров С.С.
      counterparty4Id, // клиент Смирнова Е.В.
      counterparty5Id, // исполнитель ООО "СтройСервис"
      executor1Id, // исполнитель ИП ТехноСервис
      executor2Id, // исполнитель ООО Логистика
      executor3Id, // исполнитель Сергеев С.С.
    };
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("counterparties", null, {});
  },
};
