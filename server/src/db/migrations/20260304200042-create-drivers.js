"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Создаем ENUM тип для driver_type
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_drivers_driver_type AS ENUM ('company', 'external');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Создаем таблицу drivers со ВСЕМИ полями
    await queryInterface.createTable("drivers", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      full_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      driver_type: {
        type: "enum_drivers_driver_type",
        allowNull: false,
        defaultValue: "company",
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },

      // ============= НОВЫЕ ПОЛЯ =============
      vehicle_license_plate: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      vehicle_model: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      vehicle_year: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      inspection_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      next_inspection_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      permit_valid_from: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      permit_valid_until: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      insurance_valid_from: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      insurance_valid_until: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      inspection_notified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      permit_notified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      insurance_notified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      last_notification_date: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Добавляем индексы
    await queryInterface.addIndex("drivers", ["phone"]);
    await queryInterface.addIndex("drivers", ["driver_type"]);
    await queryInterface.addIndex("drivers", ["user_id"]);
    await queryInterface.addIndex("drivers", ["is_active"]);
    await queryInterface.addIndex("drivers", ["next_inspection_date"]);
    await queryInterface.addIndex("drivers", ["permit_valid_until"]);
    await queryInterface.addIndex("drivers", ["insurance_valid_until"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("drivers");
    await queryInterface.sequelize.query(
      "DROP TYPE IF EXISTS enum_drivers_driver_type;",
    );
  },
};
