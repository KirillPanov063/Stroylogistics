"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_users_role AS ENUM ('user', 'admin', 'manager', 'driver');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

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
      email_verified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      verification_code: {
        type: Sequelize.STRING(6),
        allowNull: true,
      },
      verification_code_expires_at: {
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

    await queryInterface.addIndex("users", ["role"]);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("users");
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS enum_users_role;");
  },
};
