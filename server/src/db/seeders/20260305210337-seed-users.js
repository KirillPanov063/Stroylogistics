"use strict";
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Хешируем пароли
    const adminPassword = await bcrypt.hash("Admin123!", 10);
    const managerPassword = await bcrypt.hash("Manager123!", 10);
    const userPassword = await bcrypt.hash("User123!", 10);
    const driverPassword = await bcrypt.hash("Driver123!", 10);

    // Создаем пользователей
    await queryInterface.bulkInsert("users", [
      {
        id: uuidv4(),
        email: "admin@stroylogistics.ru",
        phone: "+79261111111",
        password_hash: adminPassword,
        full_name: "Петров Александр Игоревич",
        role: "admin",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        email: "manager@stroylogistics.ru",
        phone: "+79262222222",
        password_hash: managerPassword,
        full_name: "Соколов Дмитрий Андреевич",
        role: "manager",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        email: "user@stroylogistics.ru",
        phone: "+79263333333",
        password_hash: userPassword,
        full_name: "Иванов Иван Иванович",
        role: "user",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        email: "driver@stroylogistics.ru",
        phone: "+79264444444",
        password_hash: driverPassword,
        full_name: "Козлов Михаил Петрович",
        role: "driver",
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("users", null, {});
  },
};
