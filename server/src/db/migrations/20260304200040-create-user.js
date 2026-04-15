"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Создаем ENUM тип для роли
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_users_role AS ENUM ('user', 'admin', 'manager', 'driver');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Создаем таблицу users
    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      full_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: "enum_users_role",
        allowNull: false,
        defaultValue: "user",
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
    await queryInterface.addIndex("users", ["email"]);
    await queryInterface.addIndex("users", ["phone"]);
    await queryInterface.addIndex("users", ["role"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("users");
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS enum_users_role;
    `);
  },
};
