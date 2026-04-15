"use strict";
const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Получаем ID контрагентов из БД
    const [counterparties] = await queryInterface.sequelize.query(
      `SELECT id FROM counterparties WHERE counterparty_type IN ('client', 'both') LIMIT 3;`,
    );

    if (counterparties.length < 2) {
      console.log("Недостаточно контрагентов для создания объектов");
      return;
    }

    // Создаем объекты для первого клиента
    await queryInterface.bulkInsert("objects", [
      {
        id: uuidv4(),
        counterparty_id: counterparties[0].id,
        address: "г. Москва, ул. Тверская, д. 15, стр. 2",
        responsible_person: "Иванов Иван Иванович",
        responsible_phone: "+79261111111",
        is_active: true,
        notes: "Офисное здание, доступ с 9:00 до 18:00",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        counterparty_id: counterparties[0].id,
        address: "г. Москва, ул. Арбат, д. 25",
        responsible_person: "Петров Петр Петрович",
        responsible_phone: "+79262222222",
        is_active: true,
        notes: "Магазин, погрузка с торца",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        counterparty_id: counterparties[0].id,
        address: "МО, г. Химки, ул. Строителей, д. 7",
        responsible_person: "Сидоров Сидор Сидорович",
        responsible_phone: "+79263333333",
        is_active: false,
        notes: "Закрыто на ремонт",
        created_at: new Date(),
        updated_at: new Date(),
      },
      // Объекты для второго клиента
      {
        id: uuidv4(),
        counterparty_id: counterparties[1].id,
        address: "г. Москва, ул. Новый Арбат, д. 36",
        responsible_person: "Козлов Михаил Петрович",
        responsible_phone: "+79265555555",
        is_active: true,
        notes: "Бизнес-центр, грузовой лифт",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        counterparty_id: counterparties[1].id,
        address: "г. Москва, ул. Пятницкая, д. 70",
        responsible_person: "Смирнова Елена Владимировна",
        responsible_phone: "+79264444444",
        is_active: true,
        notes: "Ресторан, задний двор",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("objects", null, {});
  },
};
