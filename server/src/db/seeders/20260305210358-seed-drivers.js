"use strict";
const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Находим ID пользователей с ролью driver (если есть)
    const [driverUsers] = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE role = 'driver' LIMIT 4;`,
    );

    // Создаем 4 водителей
    await queryInterface.bulkInsert("drivers", [
      {
        id: uuidv4(),
        full_name: "Козлов Михаил Петрович",
        phone: "+7 (903) 555-55-55",
        driver_type: "company",
        user_id: driverUsers[0]?.id || null,
        is_active: true,

        // Данные автомобиля (машина для 8м³)
        vehicle_license_plate: "А123ВВ777",
        vehicle_model: "ГАЗель NEXT",
        vehicle_year: 2022,

        // Техосмотр
        inspection_date: "2025-06-15",
        next_inspection_date: "2026-06-15",

        // Пропуск
        permit_valid_from: "2026-01-01",
        permit_valid_until: "2026-12-31",

        // Страховка
        insurance_valid_from: "2026-01-01",
        insurance_valid_until: "2026-12-31",

        // Уведомления
        inspection_notified: false,
        permit_notified: false,
        insurance_notified: false,
        last_notification_date: null,

        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        full_name: "Морозов Андрей Сергеевич",
        phone: "+7 (903) 666-66-66",
        driver_type: "company",
        user_id: driverUsers[1]?.id || null,
        is_active: true,

        // Данные автомобиля (вторая машина для 8м³)
        vehicle_license_plate: "В456ВВ777",
        vehicle_model: "ГАЗель БИЗНЕС",
        vehicle_year: 2021,

        // Техосмотр
        inspection_date: "2025-08-20",
        next_inspection_date: "2026-08-20",

        // Пропуск
        permit_valid_from: "2026-02-01",
        permit_valid_until: "2026-11-30",

        // Страховка
        insurance_valid_from: "2026-02-01",
        insurance_valid_until: "2026-11-30",

        // Уведомления
        inspection_notified: false,
        permit_notified: false,
        insurance_notified: false,
        last_notification_date: null,

        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        full_name: "Волков Денис Александрович",
        phone: "+7 (905) 777-77-77",
        driver_type: "company",
        user_id: driverUsers[2]?.id || null,
        is_active: true,

        // Данные автомобиля (ОДНА МАШИНА для 20м³ и 27м³)
        vehicle_license_plate: "С789ВВ777",
        vehicle_model: "КАМАЗ-65115 (20/27м³)",
        vehicle_year: 2023,

        // Техосмотр
        inspection_date: "2025-09-10",
        next_inspection_date: "2026-09-10",

        // Пропуск (один пропуск на машину)
        permit_valid_from: "2026-01-01",
        permit_valid_until: "2026-12-31",

        // Страховка (одна страховка на машину)
        insurance_valid_from: "2026-01-01",
        insurance_valid_until: "2026-12-31",

        // Уведомления
        inspection_notified: false,
        permit_notified: false,
        insurance_notified: false,
        last_notification_date: null,

        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        full_name: "Соболев Игорь Владимирович",
        phone: "+7 (905) 888-88-88",
        driver_type: "company",
        user_id: driverUsers[3]?.id || null,
        is_active: true,

        // Данные автомобиля (ТА ЖЕ МАШИНА - те же данные)
        vehicle_license_plate: "С789ВВ777", // Тот же номер, что у Волкова
        vehicle_model: "КАМАЗ-65115 (20/27м³)",
        vehicle_year: 2023,

        // Техосмотр (те же даты - общая машина)
        inspection_date: "2025-09-10",
        next_inspection_date: "2026-09-10",

        // Пропуск (тот же пропуск)
        permit_valid_from: "2026-01-01",
        permit_valid_until: "2026-12-31",

        // Страховка (та же страховка)
        insurance_valid_from: "2026-01-01",
        insurance_valid_until: "2026-12-31",

        // Уведомления (индивидуальные для водителя)
        inspection_notified: false,
        permit_notified: false,
        insurance_notified: false,
        last_notification_date: null,

        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("drivers", null, {});
  },
};
