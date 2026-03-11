"use strict";

// 👇 ВАЖНО: загружаем dotenv в самом начале
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const process = require("process");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/database.json")[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  // Правильно передаем URL из process.env
  const databaseUrl = process.env[config.use_env_variable];
  if (!databaseUrl) {
    throw new Error(
      `Переменная окружения ${config.use_env_variable} не найдена`,
    );
  }
  sequelize = new Sequelize(databaseUrl, {
    dialect: "postgres",
    logging: false,
    dialectOptions: {
      ssl: false,
    },
  });
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, {
    ...config,
    logging: false,
  });
}

// Импорт всех моделей
fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file !== basename &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes,
    );
    db[model.name] = model;
    console.log(`✅ Модель загружена: ${model.name}`);
  });

// Настройка ассоциаций
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Явные ассоциации
if (db.User && db.Driver) {
  db.User.hasOne(db.Driver, {
    foreignKey: "user_id",
    as: "driver_info",
  });

  db.Driver.belongsTo(db.User, {
    foreignKey: "user_id",
    as: "user_info",
  });
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
