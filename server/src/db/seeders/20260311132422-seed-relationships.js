"use strict";
const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Получаем ID клиентов и исполнителей из БД
    const [clients] = await queryInterface.sequelize.query(
      `SELECT id FROM counterparties WHERE counterparty_type IN ('client', 'both') LIMIT 2;`,
    );

    const [executors] = await queryInterface.sequelize.query(
      `SELECT id FROM counterparties WHERE counterparty_type IN ('executor', 'both') LIMIT 2;`,
    );

    if (clients.length < 1 || executors.length < 1) {
      console.log("Недостаточно клиентов или исполнителей для создания связей");
      return;
    }

    // Создаем связи между клиентами и исполнителями
    const relationships = [];

    // Связь 1: первый клиент с первым исполнителем
    relationships.push({
      id: uuidv4(),
      client_id: clients[0].id,
      executor_id: executors[0].id,
      relationship_type: "service_provider",
      is_active: true,
      contract_number: "Д-2024-001",
      contract_date: "2024-01-15",
      notes: "Договор на вывоз мусора",
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Связь 2: первый клиент со вторым исполнителем (субподрядчик)
    if (executors.length > 1) {
      relationships.push({
        id: uuidv4(),
        client_id: clients[0].id,
        executor_id: executors[1].id,
        relationship_type: "subcontractor",
        is_active: true,
        contract_number: "Д-2024-002",
        contract_date: "2024-02-01",
        notes: "Субподряд на замену контейнеров",
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Связь 3: второй клиент с первым исполнителем (если есть второй клиент)
    if (clients.length > 1) {
      relationships.push({
        id: uuidv4(),
        client_id: clients[1].id,
        executor_id: executors[0].id,
        relationship_type: "service_provider",
        is_active: true,
        contract_number: "Д-2024-003",
        contract_date: "2024-03-10",
        notes: "Договор на обслуживание",
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    await queryInterface.bulkInsert("relationships", relationships);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("relationships", null, {});
  },
};
