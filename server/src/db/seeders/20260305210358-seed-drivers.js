"use strict";
const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Находим ID водителя из users (driver@stroylogistics.ru)
    const [driverUser] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = 'driver@stroylogistics.ru' LIMIT 1;`,
    );

    const driverId = driverUser[0]?.id;

    if (!driverId) {
      console.log(
        "Водитель не найден в таблице users, пропускаем создание driver",
      );
      return;
    }

    await queryInterface.bulkInsert("drivers", [
      {
        id: uuidv4(),
        full_name: "Козлов Михаил Петрович",
        phone: "+79264444444",
        driver_type: "company",
        user_id: driverId,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("drivers", null, {});
  },
};
