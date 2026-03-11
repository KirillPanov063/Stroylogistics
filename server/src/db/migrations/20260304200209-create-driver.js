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

    // Создаем таблицу drivers
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
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("drivers");
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_drivers_driver_type;
    `);
  },
};
