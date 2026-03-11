require("dotenv").config();

const express = require("express");
const http = require("http");
const serverConfig = require("./config/serverConfig"); // этот путь правильный
// const setupWebsockets = require('./config/websocketConfig');
const indexRouter = require("./routes/index.router");
const { sequelize } = require("./db/models");

const app = express();
const { PORT = 3000 } = process.env;

// Применяем конфигурацию сервера
serverConfig(app);

// Подключаем единый роутер
app.use("/api", indexRouter);

const server = http.createServer(app);

// Подключение к БД и запуск
sequelize
  .authenticate()
  .then(() => {
    console.log("✅ Подключение к базе данных успешно");
    server.listen(PORT, () => {
      console.log(`🚀 Сервер запущен на порту ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Ошибка подключения к базе данных:", err);
  });
