require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const serverConfig = require("./config/serverConfig");
const indexRouter = require("./routes/index.router");

// Импортируем модели
const { sequelize } = require("./db/models");

const app = express();
const { PORT = 3000 } = process.env;

// Проверка подключения Sequelize
if (!sequelize) {
  console.error("❌ Sequelize не загружен!");
  process.exit(1);
}

// ============= СОЗДАЕМ ПАПКИ ДЛЯ ЗАГРУЗОК =============
const uploadDirs = [
  path.join(__dirname, "uploads"),
  path.join(__dirname, "uploads/temp"),
  path.join(__dirname, "uploads/documents"),
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Создана директория: ${dir}`);
  }
});

// ============= СТАТИЧЕСКИЕ ФАЙЛЫ =============
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Применяем конфигурацию сервера
serverConfig(app);

// ============= ДОПОЛНИТЕЛЬНЫЕ НАСТРОЙКИ =============
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Подключаем единый роутер
app.use("/api", indexRouter);

// ============= ОБРАБОТКА ОШИБОК =============
// Обработка ошибок multer
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "Файл слишком большой. Максимальный размер 10MB",
    });
  }

  if (err.code === "FILE_TYPE_NOT_ALLOWED") {
    return res.status(400).json({
      success: false,
      message: "Неподдерживаемый тип файла. Разрешены: PDF, JPEG, PNG",
    });
  }

  next(err);
});

// Глобальная обработка ошибок
app.use((err, req, res, next) => {
  console.error("❌ Ошибка сервера:", err);
  res.status(500).json({
    success: false,
    message: "Внутренняя ошибка сервера",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const server = http.createServer(app);

// Подключение к БД и запуск
sequelize
  .authenticate()
  .then(() => {
    console.log("✅ Подключение к базе данных успешно");

    if (process.env.NODE_ENV === "development") {
      return sequelize.sync({ alter: false });
    }
  })
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Сервер запущен на порту ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(
        `📁 Загрузки сохраняются в: ${path.join(__dirname, "uploads")}`,
      );
    });
  })
  .catch((err) => {
    console.error("❌ Ошибка подключения к базе данных:", err);
  });

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Получен SIGTERM, завершаем работу...");
  server.close(() => {
    console.log("✅ Сервер остановлен");
    if (sequelize) sequelize.close();
  });
});

process.on("SIGINT", () => {
  console.log("🛑 Получен SIGINT, завершаем работу...");
  server.close(() => {
    console.log("✅ Сервер остановлен");
    if (sequelize) sequelize.close();
  });
});

module.exports = app;
